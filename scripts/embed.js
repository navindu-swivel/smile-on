const fs = require('fs');
const path = require('path');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');
const { Pinecone } = require('@pinecone-database/pinecone');
const { Document } = require('@langchain/core/documents');
require('dotenv').config({ path: '.env.local' });

const DATA_FILE = path.join(__dirname, '../data/knowledge.json');

async function embedData() {
  if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    console.error('Missing environment variables. Please check .env.local');
    process.exit(1);
  }

  console.log('Initializing Pinecone...');
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);

  console.log('Loading data...');
  const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
  const knowledge = JSON.parse(rawData);

  const docs = knowledge.map(item => {
    return new Document({
      pageContent: `${item.title}: ${item.content}`,
      metadata: {
        title: item.title,
        url: item.url,
      },
    });
  });

  console.log(`Creating embeddings for ${docs.length} documents...`);
  
  const embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small', // Efficient embedding model
  });

  console.log('Upserting to Pinecone...');
  
  await PineconeStore.fromDocuments(docs, embeddings, {
    pineconeIndex,
    maxConcurrency: 5, // Batch requests
  });

  console.log('Successfully embedded and uploaded data to Pinecone!');
}

embedData().catch(console.error);