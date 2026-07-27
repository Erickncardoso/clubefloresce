import dotenv from "dotenv";
import { prisma } from "../lib/prisma";

dotenv.config();

async function main() {
  const patient = await prisma.user.findFirst({
    where: { role: "PACIENTE" },
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "desc" },
  });

  const chunks = await prisma.knowledgeChunk.count();
  const byType = await prisma.knowledgeChunk.groupBy({
    by: ["sourceType"],
    _count: { _all: true },
  });

  let pgvector = false;
  try {
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') AS exists
    `;
    pgvector = Boolean(rows[0]?.exists);
  } catch {
    pgvector = false;
  }

  let embeddingColumn = false;
  try {
    const cols = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'KnowledgeChunk' AND column_name = 'embedding'
      ) AS exists
    `;
    embeddingColumn = Boolean(cols[0]?.exists);
  } catch {
    embeddingColumn = false;
  }

  console.log(JSON.stringify({
    patientForEval: patient,
    chunks,
    byType,
    pgvector,
    embeddingColumn,
  }, null, 2));
}

main()
  .finally(() => prisma.$disconnect());
