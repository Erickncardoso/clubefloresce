import { PrismaClient, FoodSource } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

interface FoodSeedItem {
  source: "TACO" | "TBCA";
  sourceCode: string;
  name: string;
  category: string | null;
  nutrientsPer100g: Record<string, number | null>;
  rawNutrients?: unknown;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sodiumMg: number | null;
  searchText: string;
}

const prisma = new PrismaClient();
const DATA_DIR = path.join(__dirname, "../data/foods");
const BATCH_SIZE = 250;

async function readJson(fileName: string): Promise<FoodSeedItem[]> {
  const filePath = path.join(DATA_DIR, fileName);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as FoodSeedItem[];
}

function toDbRecord(item: FoodSeedItem) {
  const nutrients = {
    per100g: item.nutrientsPer100g,
    ...(item.rawNutrients ? { rawNutrients: item.rawNutrients } : {}),
  };

  return {
    source: item.source as FoodSource,
    sourceCode: item.sourceCode,
    name: item.name,
    category: item.category,
    nutrients,
    caloriesKcal: item.caloriesKcal,
    proteinG: item.proteinG,
    carbsG: item.carbsG,
    fatG: item.fatG,
    fiberG: item.fiberG,
    sodiumMg: item.sodiumMg,
    searchText: item.searchText,
  };
}

async function importBatch(items: FoodSeedItem[]) {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      chunk.map((item) =>
        prisma.foodItem.upsert({
          where: {
            source_sourceCode: {
              source: item.source as FoodSource,
              sourceCode: item.sourceCode,
            },
          },
          create: toDbRecord(item),
          update: toDbRecord(item),
        }),
      ),
    );
    console.log(`Importados ${Math.min(i + BATCH_SIZE, items.length)}/${items.length}`);
  }
}

async function main() {
  const tacoPath = path.join(DATA_DIR, "taco.json");
  const tbcaPath = path.join(DATA_DIR, "tbca.json");

  try {
    await fs.access(tacoPath);
    await fs.access(tbcaPath);
  } catch {
    console.error("Arquivos JSON não encontrados. Rode primeiro: npm run foods:build-json");
    process.exit(1);
  }

  const taco = await readJson("taco.json");
  const tbca = await readJson("tbca.json");
  const all = [...taco, ...tbca];

  console.log(`Importando ${all.length} alimentos (TACO: ${taco.length}, TBCA: ${tbca.length})...`);
  await importBatch(all);

  const counts = await prisma.foodItem.groupBy({
    by: ["source"],
    _count: { _all: true },
  });
  console.log("Concluído:", counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
