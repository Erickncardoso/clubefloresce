import crypto from "crypto";
import type { ChunkDraft } from "./types";

const CHUNK_SIZE = Number(process.env.RAG_CHUNK_SIZE || 1500);
const CHUNK_OVERLAP = Number(process.env.RAG_CHUNK_OVERLAP || 300);

export function hashContent(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function normalizeSearchText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function splitTextIntoChunks(
  text: string,
  options: { title?: string; chunkSize?: number; overlap?: number } = {},
): string[] {
  const normalized = normalizeSearchText(text);
  if (!normalized) return [];

  const chunkSize = options.chunkSize || CHUNK_SIZE;
  const overlap = options.overlap || CHUNK_OVERLAP;
  if (normalized.length <= chunkSize) return [normalized];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + chunkSize);
    chunks.push(normalized.slice(start, end));
    if (end >= normalized.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
}

export function buildChunksFromText(
  text: string,
  base: { title: string; url?: string | null; metadata?: Record<string, unknown> },
): ChunkDraft[] {
  const parts = splitTextIntoChunks(text);
  return parts.map((content, chunkIndex) => ({
    content,
    title: parts.length > 1 ? `${base.title} (${chunkIndex + 1}/${parts.length})` : base.title,
    url: base.url,
    metadata: base.metadata,
    chunkIndex,
  }));
}

export function buildSingleChunk(
  text: string,
  base: { title: string; url?: string | null; metadata?: Record<string, unknown> },
): ChunkDraft[] {
  const content = normalizeSearchText(text);
  if (!content) return [];
  return [{
    content,
    title: base.title,
    url: base.url,
    metadata: base.metadata,
    chunkIndex: 0,
  }];
}
