
import { transcribeAndChunk } from './transcribe';
import { storeChunks, queryRelevantChunk } from './search';
import 'dotenv/config';

const videoId = 'video1';
const filePath = './test.mp4';
const userQuery = process.argv.slice(2).join(' ') || 'how do I install express';

(async () => {
  const chunks = await transcribeAndChunk(filePath);
  await storeChunks(videoId, chunks);
  await queryRelevantChunk(userQuery);
})();
