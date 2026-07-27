import type { KnowledgeSourceType } from "@prisma/client";
import { ragIndexerService, type ReindexTarget } from "./indexer.service";
import { knowledgeRepository } from "./knowledge.repository";

export function scheduleRagReindex(target: ReindexTarget): void {
  ragIndexerService.scheduleReindex(target);
}

export function scheduleRagDelete(
  sourceType: KnowledgeSourceType,
  sourceId: string,
  userId?: string | null,
): void {
  void knowledgeRepository
    .deleteSourceChunks(sourceType, sourceId, userId)
    .catch((error) => {
      console.warn("[RAG] Falha ao remover chunks:", sourceType, sourceId, error?.message || error);
    });
}
