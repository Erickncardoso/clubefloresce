import { PrismaClient, FoodSource } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { getFoodSearchAliasText } from "../src/utils/food-catalog-aliases";

interface FoodSeedItem {
  source: "TACO";
  sourceCode: string;
  name: string;
  category: string | null;
  nutrientsPer100g: Record<string, number | null>;
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

async function main() {
  const items = JSON.parse(
    await fs.readFile(path.join(DATA_DIR, "taco.json"), "utf8"),
  ) as FoodSeedItem[];

  console.log(`Importando ${items.length} TACO...`);
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      chunk.map((item) => {
        const data = {
          source: FoodSource.TACO,
          sourceCode: item.sourceCode,
          name: item.name,
          category: item.category,
          nutrients: { per100g: item.nutrientsPer100g },
          caloriesKcal: item.caloriesKcal,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
          fiberG: item.fiberG,
          sodiumMg: item.sodiumMg,
          searchText: `${item.searchText} ${getFoodSearchAliasText("TACO", item.sourceCode)}`.trim(),
        };
        return prisma.foodItem.upsert({
          where: {
            source_sourceCode: {
              source: FoodSource.TACO,
              sourceCode: item.sourceCode,
            },
          },
          create: data,
          update: data,
        });
      }),
    );
    console.log(`Importados ${Math.min(i + BATCH_SIZE, items.length)}/${items.length}`);
  }

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
