import dotenv from "dotenv";
import { prisma } from "../lib/prisma";
import { MealPlanRepository } from "../repositories/meal-plan.repository";
import type { ParsedMealPlan } from "../types/meal-plan.types";
import {
  enrichParsedMealPlan,
  parsedMealPlanNeedsFoodEnrichment,
  walkParsedMealPlanItems,
  foodItemNeedsEnrichment,
} from "../services/meal-plan/meal-plan-food-enricher";

dotenv.config();

const repo = new MealPlanRepository();

function countPlanFoodItems(plan: ParsedMealPlan) {
  let total = 0;
  let linked = 0;
  walkParsedMealPlanItems(plan, (item) => {
    total += 1;
    if (item.foodId && item.per100g?.caloriesKcal != null) linked += 1;
  });
  return { total, linked };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");
  const userArg = process.argv.find((arg) => arg.startsWith("--user="));
  const userId = userArg ? userArg.replace("--user=", "").trim() : "";

  const records = userId
    ? await prisma.patientMealPlan.findMany({ where: { userId } })
    : await prisma.patientMealPlan.findMany({ orderBy: { updatedAt: "desc" } });

  if (!records.length) {
    console.log("Nenhum plano alimentar encontrado.");
    return;
  }

  console.log(`Planos a processar: ${records.length}${dryRun ? " (dry-run)" : ""}`);

  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const plan = record.plan as unknown as ParsedMealPlan;
    const before = countPlanFoodItems(plan);

    if (!force && !parsedMealPlanNeedsFoodEnrichment(plan)) {
      skipped += 1;
      console.log(
        `[skip] user=${record.userId} itens=${before.total} vinculados=${before.linked}/${before.total}`,
      );
      continue;
    }

    const enriched = await enrichParsedMealPlan(structuredClone(plan));
    const after = countPlanFoodItems(enriched);
    const pending = after.total - after.linked;

    if (!dryRun) {
      await repo.upsert(record.userId, {
        fileName: record.fileName,
        pdfUrl: record.pdfUrl,
        title: record.title,
        patientName: record.patientName,
        prescribedAt: record.prescribedAt,
        plan: enriched,
        parserSource: record.parserSource,
      });
    }

    updated += 1;
    console.log(
      `[${dryRun ? "dry" : "ok"}] user=${record.userId} vinculados ${before.linked}/${before.total} → ${after.linked}/${after.total}${pending ? ` (sem match: ${pending})` : ""}`,
    );
  }

  console.log(JSON.stringify({ processed: records.length, updated, skipped, dryRun, force }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
