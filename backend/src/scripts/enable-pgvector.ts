import dotenv from "dotenv";
import { prisma } from "../lib/prisma";

dotenv.config();

async function main() {
  console.log("[RAG] Tentando CREATE EXTENSION vector...");
  try {
    await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector");
    console.log("[RAG] Extensão vector criada ou já existia.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[RAG] Falha ao criar extensão vector:", message);
    console.error(
      "[RAG] No Coolify, instale pgvector na imagem Postgres (ou use imagem pgvector/pgvector) e rode CREATE EXTENSION como superuser.",
    );
    process.exitCode = 1;
    return;
  }

  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') AS exists
  `;
  console.log("[RAG] pgvector ativo:", Boolean(rows[0]?.exists));
}

main().finally(() => prisma.$disconnect());
