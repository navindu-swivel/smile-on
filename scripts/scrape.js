const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');
const { Pinecone } = require('@pinecone-database/pinecone');
const { Document } = require('@langchain/core/documents');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
require('dotenv').config({ path: '.env.local' });

const START_URL = 'https://www.smileon.com.au/';
const MAX_PAGES = 50; // Limit to prevent infinite crawling
const DATA_FILE = path.join(__dirname, '../data/knowledge.json');

// Initialize Pinecone and OpenAI
if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
  console.error('Missing environment variables. Please check .env.local');
  process.exit(1);
}

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);
const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-small',
});

const visited = new Set();
const queue = [START_URL];
const allData = [];

async function scrapePage(url) {
  try {
    console.log(`Fetching ${url}...`);
    const response = await fetch(url);
    if (!response.ok) {
        console.error(`Failed to fetch ${url}: ${response.statusText}`);
        return null;
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, and other non-content elements
    $('script, style, nav, footer, header, noscript, iframe').remove();

    const title = $('title').text().trim();
    // Get main content - adjust selector based on site structure if needed
    // Using 'body' but cleaning it up is a generic approach
    const content = $('body').text().replace(/\s+/g, ' ').trim();

    const links = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
            const absoluteUrl = new URL(href, url).href;
            if (absoluteUrl.startsWith(START_URL) && !absoluteUrl.includes('#')) {
                links.push(absoluteUrl);
            }
        } catch (e) {
            // Invalid URL, ignore
        }
      }
    });

    return { title, content, links };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

async function processQueue() {
  let pagesScraped = 0;

  while (queue.length > 0 && pagesScraped < MAX_PAGES) {
    const url = queue.shift();

    if (visited.has(url)) continue;
    visited.add(url);

    const data = await scrapePage(url);
    if (data) {
      pagesScraped++;
      
      // Add new links to queue
      for (const link of data.links) {
        if (!visited.has(link)) {
          queue.push(link);
        }
      }

      // Create Document
      const doc = new Document({
        pageContent: data.content,
        metadata: {
          title: data.title,
          url: url,
        },
      });

      // Split text if it's too long
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const chunks = await splitter.splitDocuments([doc]);

      console.log(`  -> Found ${chunks.length} chunks. Upserting to Pinecone...`);

      // Upsert to Pinecone
      try {
          await PineconeStore.fromDocuments(chunks, embeddings, {
            pineconeIndex,
            maxConcurrency: 5,
          });
          console.log(`  -> Successfully upserted ${url}`);
      } catch (err) {
          console.error(`  -> Error upserting ${url}:`, err);
      }

      // Save to local array for backup/reference
      allData.push({
          title: data.title,
          content: data.content,
          url: url
      });
    }

    // Small delay to be polite
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Save all data to JSON as backup
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2));
  console.log(`\nScraping complete! Processed ${pagesScraped} pages.`);
  console.log(`Backup saved to ${DATA_FILE}`);
}

processQueue().catch(console.error);
