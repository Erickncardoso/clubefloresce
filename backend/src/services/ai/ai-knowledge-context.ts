import { ragRetrievalService } from "../rag/retrieval.service";
import type { KnowledgeSourceType } from "../rag/types";

export interface AiKnowledgeContextOptions {
  userId: string;
  query: string;
  topic?: string;
  limit?: number;
  sourceTypes?: KnowledgeSourceType[];
  skipQueryExpansion?: boolean;
}

/**
 * Recupera conhecimento da base RAG para injetar em qualquer fluxo de IA do backend
 * (Bella, anamnese, documentos, PDFs, receitas, etc.).
 */
export async function buildAiKnowledgeContext(
  options: AiKnowledgeContextOptions,
): Promise<string> {
  const query = String(options.query || "").trim();
  if (!query || !options.userId) return "";

  const result = await ragRetrievalService.retrieve({
    userId: options.userId,
    query,
    topic: options.topic,
    limit: options.limit,
    sourceTypes: options.sourceTypes,
    skipQueryExpansion: options.skipQueryExpansion,
  });

  return ragRetrievalService.buildPromptBlock(result);
}
