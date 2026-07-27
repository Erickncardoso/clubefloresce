/**
 * Reaplica searchText dos FoodItem com aliases atuais (food-catalog-aliases.ts)
 * e reseed de FoodOverride CUSTOM.
 *
 * Uso: npx ts-node scripts/patch-food-aliases.ts
 */
import { FoodSource, PrismaClient } from "@prisma/client";
import {
  foodCatalogKey,
  getFoodSearchAliasText,
} from "../src/utils/food-catalog-aliases";
import { normalizeFoodSearchQuery } from "../src/utils/food-search";
import { ensureFoodOverridesSeeded } from "../src/services/food-overrides.service";

const prisma = new PrismaClient();

const CODES: Array<{ source: FoodSource; sourceCode: string }> = [
  { source: "TBCA", sourceCode: "BRC0002A" },
  { source: "TBCA", sourceCode: "BRC0149A" },
  { source: "TBCA", sourceCode: "BRC0173A" },
  { source: "TBCA", sourceCode: "BRC0290T" },
  { source: "TBCA", sourceCode: "BRC0041N" },
  { source: "TBCA", sourceCode: "BRC0067G" },
  { source: "TBCA", sourceCode: "BRC0145A" },
  { source: "TBCA", sourceCode: "BRC0003A" },
  { source: "TBCA", sourceCode: "BRC0155A" },
  { source: "TACO", sourceCode: "53" },
  { source: "TACO", sourceCode: "63" },
  { source: "TACO", sourceCode: "48" },
  { source: "TACO", sourceCode: "47" },
  { source: "TACO", sourceCode: "49" },
  { source: "TACO", sourceCode: "50" },
  { source: "TACO", sourceCode: "91" },
  { source: "TACO", sourceCode: "92" },
  { source: "TACO", sourceCode: "471" },
  { source: "TACO", sourceCode: "3" },
  { source: "TACO", sourceCode: "179" },
  { source: "TACO", sourceCode: "182" },
  { source: "TBCA", sourceCode: "BRC0275C" },
  { source: "TACO", sourceCode: "222" },
  { source: "TBCA", sourceCode: "BRC0023C" },
  { source: "TBCA", sourceCode: "BRC0017C" },
  { source: "TBCA", sourceCode: "BRC0399A" },
  { source: "TBCA", sourceCode: "BRC0007H" },
  { source: "TBCA", sourceCode: "BRC0010J" },
  { source: "TBCA", sourceCode: "BRC0727F" },
  { source: "TBCA", sourceCode: "BRC0194F" },
  { source: "TBCA", sourceCode: "BRC0023B" },
  { source: "TBCA", sourceCode: "BRC0389B" },
  { source: "TBCA", sourceCode: "BRC0059G" },
  { source: "TBCA", sourceCode: "BRC0906B" },
  { source: "TBCA", sourceCode: "BRC0029C" },
  { source: "TBCA", sourceCode: "BRC0035B" },
  { source: "TBCA", sourceCode: "BRC0040N" },
  { source: "TACO", sourceCode: "115" },
  { source: "TACO", sourceCode: "239" },
  { source: "TACO", sourceCode: "157" },
];

async function main() {
  console.log("Reseed FoodOverride (CUSTOM)...");
  await ensureFoodOverridesSeeded();

  console.log("Atualizando searchText com aliases...");
  for (const { source, sourceCode } of CODES) {
    const row = await prisma.foodItem.findUnique({
      where: { source_sourceCode: { source, sourceCode } },
    });
    if (!row) {
      console.warn(`  [skip] ${foodCatalogKey(source, sourceCode)} não encontrado`);
      continue;
    }
    const base = normalizeFoodSearchQuery(`${row.name} ${row.category || ""}`);
    const aliasText = getFoodSearchAliasText(
      source === "TACO" ? "TACO" : "TBCA",
      sourceCode,
    );
    const searchText = `${base} ${aliasText}`.trim();
    await prisma.foodItem.update({
      where: { id: row.id },
      data: { searchText },
    });
    console.log(`  [ok] ${foodCatalogKey(source, sourceCode)} ← ${aliasText || "(sem alias)"}`);
  }

  const overrides = await prisma.foodOverride.count();
  const counts = await prisma.foodItem.groupBy({
    by: ["source"],
    _count: { _all: true },
  });
  console.log("Overrides CUSTOM:", overrides);
  console.log("FoodItem:", counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
