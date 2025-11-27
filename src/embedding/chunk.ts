export type TextChunk = {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
};

import { randomUUID } from "crypto";

function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

export function chunkText(text: string, chunkSizeTokens: number, overlapTokens: number): TextChunk[] {
  const words = splitWords(text);
  const chunks: TextChunk[] = [];
  let start = 0;
  const step = Math.max(1, chunkSizeTokens - overlapTokens);
  while (start < words.length) {
    const end = Math.min(words.length, start + chunkSizeTokens);
    const slice = words.slice(start, end).join(" ");
    chunks.push({
      id: randomUUID(),
      content: slice,
      metadata: { startWord: start, endWord: end },
    });
    if (end === words.length) break;
    start += step;
  }
  return chunks;
}
