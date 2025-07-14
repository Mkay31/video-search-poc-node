import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';
import { OpenAI } from 'openai';
import { TranscriptChunk } from './types';
import mime from 'mime-types';

config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function transcribeAndChunk(filePath: string, chunkDuration = 10): Promise<TranscriptChunk[]> {
  const fileStream = fs.createReadStream(filePath);
  const fileName = path.basename(filePath);
  const type = mime.lookup(filePath) || 'application/octet-stream';

  const response = await openai.audio.transcriptions.create({
    file: {
      name: fileName,
      type: type,
      stream: fileStream,
    } as any, // workaround for stream-based file input
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  const segments = (response as any).segments;
  const chunks: TranscriptChunk[] = [];

  let currentChunk: any[] = [];
  let startTime = segments?.[0]?.start || 0;

  for (const segment of segments) {
    currentChunk.push(segment);
    const currentEnd = segment.end;

    if (currentEnd - startTime >= chunkDuration) {
      chunks.push({
        timestamp: formatTime(startTime),
        text: currentChunk.map(s => s.text).join(' ').trim(),
      });
      currentChunk = [];
      startTime = currentEnd;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push({
      timestamp: formatTime(startTime),
      text: currentChunk.map(s => s.text).join(' ').trim(),
    });
  }

  return chunks;
}

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
