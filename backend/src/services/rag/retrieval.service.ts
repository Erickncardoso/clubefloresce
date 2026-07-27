import { OpenAIClient } from "../bella/openai.client";
import { getModelForTask } from "../bella/model-config";
import { embeddingService } from "./embedding.service";
import { knowledgeRepository } from "./knowledge.repository";
import {
  DEFAULT_RETRIEVAL_LIMIT,
  HYBRID_CANDIDATE_LIMIT,
  MIN_SIMILARITY_SCORE,
  type RetrievedChunk,
  type RetrievalOptions,
  type RetrievalResult,
} from "./types";

function mergeCandidates(
  vectorRows: RetrievedChunk[],
  ftsRows: RetrievedChunk[],
): RetrievedChunk[] {
  const map = new Map<string, RetrievedChunk>();

  for (const row of vectorRows) {
    map.set(row.id, row);
  }

  for (const row of ftsRows) {
    const existing = map.get(row.id);
    if (existing) {
      existing.score = Math.max(existing.score, row.score);
      existing.matchKind = "both";
    } else {
      map.set(row.id, row);
    }
  }

  return [...map.values()].sort((a, b) => b.score - a.score);
}

function formatChunkForPrompt(chunk: RetrievedChunk, index: number): string {
  const sourceLabel = chunk.url ? `${chunk.title} (${chunk.url})` : chunk.title;
  return `[${index + 1}] ${sourceLabel}\n${chunk.content}`;
}

export class RagRetrievalService {
  private llm = new OpenAIClient();

  async expandQuery(query: string): Promise<string[]> {
    const base = query.trim();
    if (!base) return [];

    if (!this.llm.isEnabled()) {
      return [base];
    }

    try {
      const completion = await this.llm.complete({
        model: getModelForTask("chat"),
        temperature: 0.2,
        maxTokens: 180,
        messages: [
          {
            role: "system",
            content: "Gere 2 reformulações curtas em português do Brasil para busca em base de conhecimento nutricional. Responda só JSON: {\"queries\":[\"...\",\"...\"]}",
          },
          { role: "user", content: base },
        ],
        responseFormat: { type: "json_object" },
      });

      const parsed = JSON.parse(completion.content || "{}") as { queries?: string[] };
      const extras = (parsed.queries || []).map((item) => String(item || "").trim()).filter(Boolean);
      return [base, ...extras].slice(0, 3);
    } catch {
      return [base];
    }
  }

  async retrieve(options: RetrievalOptions): Promise<RetrievalResult> {
    const limit = options.limit || DEFAULT_RETRIEVAL_LIMIT;
    const query = options.query.trim();
    if (!query) {
      return { matched: false, chunks: [], expandedQueries: [], topScore: null };
    }

    if (!embeddingService.isEnabled()) {
      const ftsOnly = await knowledgeRepository.searchFullText(
        query,
        options.userId,
        limit,
        options.sourceTypes,
      );
      const topScore = ftsOnly[0]?.score ?? null;
      const matched = Boolean(topScore && topScore > 0.05);
      if (!options.skipLogging) {
        await knowledgeRepository.logQuery({
          userId: options.userId,
          query,
          expandedQueries: [query],
          chunkIds: ftsOnly.map((item) => item.id),
          topScore,
          matched,
          topic: options.topic,
        });
      }
      return { matched, chunks: ftsOnly.slice(0, limit), expandedQueries: [query], topScore };
    }

    const expandedQueries = options.skipQueryExpansion
      ? [query]
      : await this.expandQuery(query);

    const queryEmbedding = await embeddingService.embedText(expandedQueries[0] || query);
    const [vectorRows, ftsRows] = await Promise.all([
      knowledgeRepository.searchVector(
        queryEmbedding,
        options.userId,
        HYBRID_CANDIDATE_LIMIT,
        options.sourceTypes,
      ),
      knowledgeRepository.searchFullText(
        query,
        options.userId,
        HYBRID_CANDIDATE_LIMIT,
        options.sourceTypes,
      ),
    ]);

    const merged = mergeCandidates(vectorRows, ftsRows);
    const topScore = merged[0]?.score ?? null;
    const ftsOnlyMode = vectorRows.length === 0 && ftsRows.length > 0;
    const minScore = ftsOnlyMode ? 0.05 : MIN_SIMILARITY_SCORE;
    const matched = Boolean(topScore && topScore >= minScore);
    const chunks = matched ? merged.slice(0, limit) : [];

    if (!options.skipLogging) {
      await knowledgeRepository.logQuery({
        userId: options.userId,
        query,
        expandedQueries,
        chunkIds: chunks.map((item) => item.id),
        topScore,
        matched,
        topic: options.topic,
      });
    }

    return { matched, chunks, expandedQueries, topScore };
  }

  buildPromptBlock(result: RetrievalResult): string {
    if (!result.matched || !result.chunks.length) {
      return `## Conhecimento recuperado
Nenhum trecho relevante foi encontrado na base do Clube Florescer para esta pergunta.
Não invente conteúdo da Biblioteca. Diga que não encontrou material específico e sugira explorar /conteudo ou falar com a nutricionista.`;
    }

    const body = result.chunks.map(formatChunkForPrompt).join("\n\n");
    return `## Conhecimento recuperado (cite a fonte entre colchetes quando usar)
${body}

Regras:
- Priorize estes trechos sobre conhecimento genérico.
- Se usar um trecho, mencione a fonte (título ou link).
- Não prescreva tratamento clínico.`;
  }

  formatToolResult(result: RetrievalResult): string {
    if (!result.matched || !result.chunks.length) {
      return "Nenhum conteúdo relevante encontrado na base de conhecimento para esta busca.";
    }

    return result.chunks
      .map((chunk, index) => {
        const source = chunk.url ? `${chunk.title} — ${chunk.url}` : chunk.title;
        return `${index + 1}. [${chunk.sourceType}] ${source} (score ${chunk.score.toFixed(2)})\n${chunk.content}`;
      })
      .join("\n\n");
  }
}

export const ragRetrievalService = new RagRetrievalService();
