import { NextResponse } from 'next/server';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
        return NextResponse.json({ error: 'Server configuration error: Missing API keys' }, { status: 500 });
    }

    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);

    // Initialize Vector Store
    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings({ model: 'text-embedding-3-small' }),
      { pineconeIndex }
    );

    // Retrieve relevant documents
    const retriever = vectorStore.asRetriever(3); // Get top 3 matches
    const relevantDocs = await retriever.invoke(message);
    const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');

    // Initialize Chat Model (GPT-5.1-mini)
    const model = new ChatOpenAI({
      modelName: 'gpt-5-mini',
    //   temperature: 0.2,
    });

    // Create Prompt
    const template = `You are a helpful assistant for "Smile On", a dental clinic network.
    Use the following pieces of context to answer the user's question.
    If you don't know the answer, just say that you don't know, don't try to make up an answer.
    
    Context:
    {context}
    
    Question: {question}
    
    Answer:`;

    const prompt = PromptTemplate.fromTemplate(template);

    // Create Chain
    const chain = RunnableSequence.from([
      {
        context: () => context,
        question: () => message,
      },
      prompt,
      model,
      new StringOutputParser(),
    ]);

    // Run Chain
    const response = await chain.invoke({});

    return NextResponse.json({ response });

  } catch (error) {
    console.error('Error processing chat request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}