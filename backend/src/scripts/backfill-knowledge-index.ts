import dotenv from "dotenv";
import { prisma } from "../lib/prisma";
import { ragIndexerService } from "../services/rag/indexer.service";

dotenv.config();

async function main() {
  const patientId = process.argv[2] || null;

  console.log("[RAG] Iniciando backfill global...");
  const global = await ragIndexerService.backfillAll();
  console.log("[RAG] Global:", global.global);

  if (patientId) {
    console.log(`[RAG] Backfill paciente ${patientId}...`);
    const patient = await ragIndexerService.backfillPatient(patientId);
    console.log("[RAG] Paciente:", patient);
  } else {
    const patients = await prisma.patientMealPlan.findMany({ select: { userId: true } });
    console.log(`[RAG] Backfill de ${patients.length} planos alimentares...`);
    for (const row of patients) {
      const stats = await ragIndexerService.backfillPatient(row.userId);
      console.log(`  - ${row.userId}:`, stats);
    }
  }

  console.log("[RAG] Backfill concluído.");
}

main()
  .catch((error) => {
    console.error("[RAG] Falha no backfill:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
