import { Prisma, type KnowledgeSourceType } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";
import { hashContent, normalizeSearchText } from "./chunker.service";
import { isPgVectorAvailable } from "./rag-capabilities";
import type { IndexedChunkInput, RetrievedChunk } from "./types";

function vectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

export class KnowledgeRepository {
  async deleteSourceChunks(
    sourceType: KnowledgeSourceType,
    sourceId: string,
    userId?: string | null,
  ): Promise<void> {
    await prisma.knowledgeChunk.deleteMany({
      where: {
        sourceType,
        sourceId,
        userId: userId ?? null,
      },
    });
  }

  async upsertChunks(chunks: IndexedChunkInput[], embeddings: number[][]): Promise<number> {
    if (chunks.length !== embeddings.length) {
      throw new Error("Chunks e embeddings com tamanhos diferentes.");
    }

    if (!chunks.length) return 0;

    const first = chunks[0];
    await this.deleteSourceChunks(first.sourceType, first.sourceId, first.userId);

    const useVector = await isPgVectorAvailable();
    let inserted = 0;

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      const contentHash = hashContent(chunk.content);
      const searchText = normalizeSearchText(`${chunk.title}\n${chunk.content}`);

      if (useVector && embedding?.length) {
        const id = randomUUID();
        await prisma.$executeRaw`
          INSERT INTO "KnowledgeChunk" (
            "id", "content", "contentHash", "sourceType", "sourceId", "userId",
            "title", "url", "metadata", "searchText", "chunkIndex", "indexedAt", "updatedAt", "embedding"
          ) VALUES (
            ${id},
            ${chunk.content},
            ${contentHash},
            ${chunk.sourceType}::"KnowledgeSourceType",
            ${chunk.sourceId},
            ${chunk.userId ?? null},
            ${chunk.title},
            ${chunk.url ?? null},
            ${chunk.metadata ? JSON.stringify(chunk.metadata) : null}::jsonb,
            ${searchText},
            ${chunk.chunkIndex},
            NOW(),
            NOW(),
            ${Prisma.raw(`${vectorLiteral(embedding)}::vector`)}
          )
        `;
        inserted += 1;
        continue;
      }

      await prisma.knowledgeChunk.create({
        data: {
          content: chunk.content,
          contentHash,
          sourceType: chunk.sourceType,
          sourceId: chunk.sourceId,
          userId: chunk.userId ?? null,
          title: chunk.title,
          url: chunk.url ?? null,
          metadata: chunk.metadata as Prisma.InputJsonValue,
          searchText,
          chunkIndex: chunk.chunkIndex,
        },
      });
      inserted += 1;
    }

    return inserted;
  }

  async searchVector(
    embedding: number[],
    userId: string,
    limit: number,
    sourceTypes?: KnowledgeSourceType[],
  ): Promise<RetrievedChunk[]> {
    if (!(await isPgVectorAvailable())) return [];

    const vector = vectorLiteral(embedding);
    const typeFilter = sourceTypes?.length
      ? Prisma.sql`AND "sourceType" IN (${Prisma.join(sourceTypes.map((t) => Prisma.sql`${t}::"KnowledgeSourceType"`))})`
      : Prisma.empty;

    try {
      const rows = await prisma.$queryRaw<
        {
          id: string;
          content: string;
          title: string;
          url: string | null;
          sourceType: KnowledgeSourceType;
          sourceId: string;
          metadata: Record<string, unknown> | null;
          score: number;
        }[]
      >(Prisma.sql`
        SELECT
          "id",
          "content",
          "title",
          "url",
          "sourceType",
          "sourceId",
          "metadata",
          1 - ("embedding" <=> ${Prisma.raw(`${vector}::vector`)}) AS score
        FROM "KnowledgeChunk"
        WHERE "embedding" IS NOT NULL
          AND ("userId" IS NULL OR "userId" = ${userId})
          ${typeFilter}
        ORDER BY "embedding" <=> ${Prisma.raw(`${vector}::vector`)}
        LIMIT ${limit}
      `);

      return rows.map((row) => ({
        ...row,
        matchKind: "vector" as const,
      }));
    } catch {
      return [];
    }
  }

  async searchFullText(
    query: string,
    userId: string,
    limit: number,
    sourceTypes?: KnowledgeSourceType[],
  ): Promise<RetrievedChunk[]> {
    const typeFilter = sourceTypes?.length
      ? Prisma.sql`AND "sourceType" IN (${Prisma.join(sourceTypes.map((t) => Prisma.sql`${t}::"KnowledgeSourceType"`))})`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<
      {
        id: string;
        content: string;
        title: string;
        url: string | null;
        sourceType: KnowledgeSourceType;
        sourceId: string;
        metadata: Record<string, unknown> | null;
        score: number;
      }[]
    >(Prisma.sql`
      SELECT
        "id",
        "content",
        "title",
        "url",
        "sourceType",
        "sourceId",
        "metadata",
        ts_rank(
          to_tsvector('portuguese', "searchText"),
          plainto_tsquery('portuguese', ${query})
        ) AS score
      FROM "KnowledgeChunk"
      WHERE to_tsvector('portuguese', "searchText") @@ plainto_tsquery('portuguese', ${query})
        AND ("userId" IS NULL OR "userId" = ${userId})
        ${typeFilter}
      ORDER BY score DESC
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      ...row,
      matchKind: "fts" as const,
    }));
  }

  async logQuery(input: {
    userId?: string;
    query: string;
    expandedQueries?: string[];
    chunkIds?: string[];
    topScore?: number | null;
    matched: boolean;
    topic?: string;
  }): Promise<void> {
    await prisma.ragQueryLog.create({
      data: {
        userId: input.userId,
        query: input.query,
        expandedQueries: input.expandedQueries || [],
        chunkIds: input.chunkIds || [],
        topScore: input.topScore ?? null,
        matched: input.matched,
        topic: input.topic,
      },
    });
  }
}

export const knowledgeRepository = new KnowledgeRepository();
