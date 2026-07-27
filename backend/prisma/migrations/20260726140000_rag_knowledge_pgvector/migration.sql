-- RAG knowledge base (FTS-first; pgvector opcional via migration futura)
CREATE TYPE "KnowledgeSourceType" AS ENUM (
  'lesson',
  'ebook',
  'course',
  'post',
  'meal_plan',
  'checkin',
  'profile',
  'food',
  'nutri_note'
);

CREATE TABLE "KnowledgeChunk" (
  "id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "sourceType" "KnowledgeSourceType" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "userId" TEXT,
  "title" TEXT NOT NULL,
  "url" TEXT,
  "metadata" JSONB,
  "searchText" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL DEFAULT 0,
  "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeChunk_sourceType_sourceId_userId_chunkIndex_key"
  ON "KnowledgeChunk"("sourceType", "sourceId", "userId", "chunkIndex");

CREATE INDEX "KnowledgeChunk_sourceType_sourceId_idx"
  ON "KnowledgeChunk"("sourceType", "sourceId");

CREATE INDEX "KnowledgeChunk_userId_sourceType_idx"
  ON "KnowledgeChunk"("userId", "sourceType");

CREATE INDEX "KnowledgeChunk_search_fts_idx"
  ON "KnowledgeChunk" USING gin (to_tsvector('portuguese', "searchText"));

CREATE TABLE "RagQueryLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "query" TEXT NOT NULL,
  "expandedQueries" JSONB,
  "chunkIds" JSONB,
  "topScore" DOUBLE PRECISION,
  "matched" BOOLEAN NOT NULL DEFAULT false,
  "topic" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RagQueryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RagQueryLog_createdAt_idx" ON "RagQueryLog"("createdAt");
CREATE INDEX "RagQueryLog_matched_createdAt_idx" ON "RagQueryLog"("matched", "createdAt");
