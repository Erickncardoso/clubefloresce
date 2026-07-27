-- pgvector opcional: só aplica se a extensão existir no servidor Postgres
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    CREATE EXTENSION IF NOT EXISTS vector;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'KnowledgeChunk' AND column_name = 'embedding'
    ) THEN
      ALTER TABLE "KnowledgeChunk" ADD COLUMN "embedding" vector(1536);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'KnowledgeChunk_embedding_hnsw_idx'
    ) THEN
      CREATE INDEX "KnowledgeChunk_embedding_hnsw_idx"
        ON "KnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops);
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgvector indisponível — RAG continuará em modo FTS-only: %', SQLERRM;
END $outer$;
