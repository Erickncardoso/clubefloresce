import type { KnowledgeSourceType } from "@prisma/client";

export type { KnowledgeSourceType };

export const EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL || "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export const MIN_SIMILARITY_SCORE = Number(process.env.RAG_MIN_SIMILARITY || 0.72);
export const DEFAULT_RETRIEVAL_LIMIT = 5;
export const HYBRID_CANDIDATE_LIMIT = 20;

export interface ChunkDraft {
  content: string;
  title: string;
  url?: string | null;
  metadata?: Record<string, unknown>;
  chunkIndex: number;
}

export interface IndexedChunkInput extends ChunkDraft {
  sourceType: KnowledgeSourceType;
  sourceId: string;
  userId?: string | null;
}

export interface RetrievedChunk {
  id: string;
  content: string;
  title: string;
  url: string | null;
  sourceType: KnowledgeSourceType;
  sourceId: string;
  metadata: Record<string, unknown> | null;
  score: number;
  matchKind: "vector" | "fts" | "both";
}

export interface RetrievalResult {
  matched: boolean;
  chunks: RetrievedChunk[];
  expandedQueries: string[];
  topScore: number | null;
}

export interface RetrievalOptions {
  userId: string;
  query: string;
  limit?: number;
  sourceTypes?: KnowledgeSourceType[];
  topic?: string;
  skipQueryExpansion?: boolean;
  skipLogging?: boolean;
}
