import { OpenAI } from 'openai';
import { ChromaClient } from 'chromadb';
import { TranscriptChunk } from './types';
import { config } from 'dotenv';

config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const chroma = new ChromaClient();

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return res.data[0].embedding;
}

export async function storeChunks(videoId: string, chunks: TranscriptChunk[]) {
  const collection = await chroma.getOrCreateCollection({ name: 'video_chunks' });

  for (const chunk of chunks) {
    const embedding = await embed(chunk.text);

    await collection.add({
      ids: [`${videoId}-${chunk.timestamp}`],
      embeddings: [embedding],
      documents: [chunk.text],
      metadatas: [{ videoId, timestamp: chunk.timestamp }],
    });
  }

  console.log(`✅ Stored ${chunks.length} chunks.`);
}

export async function queryRelevantChunk(userQuery: string) {
  const collection = await chroma.getCollection({ name: 'video_chunks' });
  const queryEmbedding = await embed(userQuery);

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: 1,
  });

  const best = results.metadatas?.[0]?.[0];
  const doc = results.documents?.[0]?.[0];

  if (best && doc) {
    console.log(`\n✅ Best match for: "${userQuery}"`);
    console.log(`• Video ID: ${best.videoId}`);
    console.log(`• Timestamp: ${best.timestamp}`);
    console.log(`• Text: ${doc}`);
  } else {
    console.log('❌ No relevant chunk found.');
  }
}
