import { createHash } from "crypto";
import { prisma } from "../lib/prisma";
import { normalizeFoodSearchQuery } from "../utils/food-search";
import type { FoodItemDto } from "../types/food.types";
import { OpenAIClient } from "./bella/openai.client";
import { getModelForTask } from "./bella/model-config";
import { cleanFoodMatchQuery } from "./food-smart-match.service";
import { isAbsurdFoodMatch, sanitizeResearchedPer100g } from "../utils/food-match-guards";

export type FoodResearchSource = "openfoodfacts" | "usda";

export interface ResearchedFoodMacros {
  name: string;
  category: string | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  sodiumMg: number | null;
  source: FoodResearchSource;
  sourceRef: string;
  sourceLabel: string;
}

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_pt?: string;
  brands?: string;
  categories_tags?: string[];
  nutriments?: Record<string, number | undefined>;
  countries_tags?: string[];
};

type UsdaFood = {
  fdcId?: number;
  description?: string;
  brandOwner?: string;
  foodNutrients?: Array<{ nutrientName?: string; value?: number; unitName?: string }>;
};

const llm = new OpenAIClient();
const memoryCache = new Map<string, FoodItemDto | null>();

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function autoCode(name: string): string {
  const normalized = normalizeFoodSearchQuery(name).replace(/\s+/g, "_").slice(0, 48);
  const hash = createHash("sha1").update(normalized).digest("hex").slice(0, 8);
  return `AUTO_${normalized}_${hash}`.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 80);
}

function shouldSkipResearch(name: string): boolean {
  const n = normalizeFoodSearchQuery(name);
  if (n.length < 3) return true;
  if (
    /misture|compre |colher de cha do mix|shot matinal|opcional|a vontade|nao opcional|instruc/.test(
      n,
    )
  ) {
    return true;
  }
  return false;
}

/** Só campos *_100g — nunca porção/serving. */
function readPer100g(nutriments: Record<string, number | undefined> | undefined, keys: string[]) {
  if (!nutriments) return null;
  for (const key of keys) {
    if (!key.includes("_100g")) continue;
    const value = nutriments[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function finalizeMacros(
  query: string,
  draft: Omit<ResearchedFoodMacros, "caloriesKcal" | "proteinG" | "carbsG" | "fatG" | "fiberG"> & {
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number | null;
  },
): ResearchedFoodMacros | null {
  if (isAbsurdFoodMatch(query, draft.name, draft)) return null;
  const sanitized = sanitizeResearchedPer100g(draft);
  if (!sanitized) return null;
  return {
    ...draft,
    ...sanitized,
  };
}

/** @internal exportado para testes */
export function parseOffMacros(product: OffProduct, query = ""): ResearchedFoodMacros | null {
  const nutriments = product.nutriments || {};
  const calories = readPer100g(nutriments, ["energy-kcal_100g", "energy_kcal_100g"]);
  const protein = readPer100g(nutriments, ["proteins_100g"]);
  const carbs = readPer100g(nutriments, ["carbohydrates_100g"]);
  const fat = readPer100g(nutriments, ["fat_100g"]);
  if (calories == null || protein == null || carbs == null || fat == null) return null;
  if (calories <= 0 && protein <= 0 && carbs <= 0 && fat <= 0) return null;

  const fiber = readPer100g(nutriments, ["fiber_100g"]);
  let sodium = readPer100g(nutriments, ["sodium_100g"]);
  if (sodium != null && sodium > 0 && sodium < 5) sodium = sodium * 1000;

  const name =
    String(product.product_name_pt || product.product_name || "").trim() ||
    "Alimento (Open Food Facts)";
  const brand = String(product.brands || "").trim();
  const displayName = brand ? `${name} (${brand.split(",")[0].trim()})` : name;
  const barcode = String(product.code || "").trim();

  return finalizeMacros(query || name, {
    name: displayName.slice(0, 180),
    category: "Auto · Open Food Facts",
    caloriesKcal: round1(calories),
    proteinG: round1(protein),
    carbsG: round1(carbs),
    fatG: round1(fat),
    fiberG: fiber == null ? null : round1(fiber),
    sodiumMg: sodium == null ? null : Math.round(sodium),
    source: "openfoodfacts",
    sourceRef: barcode
      ? `openfoodfacts:${barcode}`
      : `openfoodfacts:search:${normalizeFoodSearchQuery(name)}`,
    sourceLabel: barcode ? `Open Food Facts (${barcode})` : "Open Food Facts",
  });
}

/** @internal exportado para testes */
export function parseUsdaMacros(food: UsdaFood, query = ""): ResearchedFoodMacros | null {
  const nutrients = food.foodNutrients || [];
  const find = (names: string[], preferUnit?: string) => {
    const hits = nutrients.filter((n) =>
      names.some((name) => String(n.nutrientName || "").toLowerCase() === name.toLowerCase()),
    );
    if (!hits.length) return null;
    const preferred = preferUnit
      ? hits.find((n) => String(n.unitName || "").toUpperCase() === preferUnit.toUpperCase())
      : null;
    const hit = preferred || hits[0];
    if (typeof hit?.value !== "number" || !Number.isFinite(hit.value)) return null;
    const unit = String(hit.unitName || "").toUpperCase();
    if (preferUnit === "KCAL" && (unit === "KJ" || unit === "KJOULES")) {
      return hit.value / 4.184;
    }
    return hit.value;
  };

  const calories = find(["Energy"], "KCAL");
  const protein = find(["Protein"]);
  const carbs = find(["Carbohydrate, by difference"]);
  const fat = find(["Total lipid (fat)"]);
  if (calories == null || protein == null || carbs == null || fat == null) return null;

  const fiber = find(["Fiber, total dietary"]);
  const sodium = find(["Sodium, Na"]);
  const name = String(food.description || "").trim();
  if (!name) return null;

  return finalizeMacros(query || name, {
    name: name.slice(0, 180),
    category: "Auto · USDA FDC",
    caloriesKcal: round1(calories),
    proteinG: round1(protein),
    carbsG: round1(carbs),
    fatG: round1(fat),
    fiberG: fiber == null ? null : round1(fiber),
    sodiumMg: sodium == null ? null : Math.round(sodium),
    source: "usda",
    sourceRef: food.fdcId ? `usda:${food.fdcId}` : `usda:search:${normalizeFoodSearchQuery(name)}`,
    sourceLabel: food.fdcId ? `USDA FDC (${food.fdcId})` : "USDA FDC",
  });
}

async function searchOpenFoodFacts(query: string): Promise<OffProduct[]> {
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=12&cc=br&lc=pt`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "ClubeFlorescer-FoodResearch/1.0",
      Accept: "application/json",
    },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { products?: OffProduct[] };
  return Array.isArray(data.products) ? data.products : [];
}

async function searchUsda(query: string): Promise<UsdaFood[]> {
  const apiKey = process.env.USDA_FDC_API_KEY?.trim() || "DEMO_KEY";
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}` +
    `&query=${encodeURIComponent(query)}&pageSize=8`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const data = (await res.json()) as { foods?: UsdaFood[] };
  return Array.isArray(data.foods) ? data.foods : [];
}

async function pickBestCandidateIndex(query: string, labels: string[]): Promise<number | null> {
  if (!labels.length) return null;
  if (!llm.isEnabled()) {
    const q = normalizeFoodSearchQuery(query);
    const hit = labels.findIndex((label) => {
      const n = normalizeFoodSearchQuery(label);
      return q.split(" ").some((t) => t.length >= 4 && n.includes(t));
    });
    return hit >= 0 ? hit : null;
  }

  try {
    const completion = await llm.complete({
      model: getModelForTask("chat"),
      temperature: 0,
      maxTokens: 120,
      responseFormat: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Você escolhe o melhor alimento da lista para casar com o nome do plano alimentar brasileiro. " +
            "Retorne SOMENTE JSON {\"index\": number|null}. Use null se nenhum for o mesmo alimento " +
            "(ex.: rejeite óleo quando o pedido for quinoa; rejeite batata-doce quando for batata inglesa; " +
            "rejeite café torrado moído quando for café coado). Não invente nutrientes.",
        },
        {
          role: "user",
          content: JSON.stringify({
            query,
            candidates: labels.map((label, index) => ({ index, label })),
          }),
        },
      ],
    });
    if (!completion.content) return null;
    const parsed = JSON.parse(completion.content) as { index?: number | null };
    if (parsed.index == null) return null;
    const index = Number(parsed.index);
    if (!Number.isInteger(index) || index < 0 || index >= labels.length) return null;
    if (isAbsurdFoodMatch(query, labels[index])) return null;
    return index;
  } catch {
    return null;
  }
}

function toFoodItemDto(row: {
  id: string;
  code: string;
  name: string;
  category: string | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  sodiumMg: number | null;
}): FoodItemDto {
  return {
    id: row.id,
    source: "CUSTOM",
    sourceCode: row.code,
    name: row.name,
    displayName: row.name,
    category: row.category,
    nutrients: { per100g: {} },
    per100g: {
      caloriesKcal: row.caloriesKcal,
      proteinG: row.proteinG,
      carbsG: row.carbsG,
      fatG: row.fatG,
      fiberG: row.fiberG,
      sodiumMg: row.sodiumMg,
    },
  };
}

async function upsertCustomFromResearch(
  queryName: string,
  researched: ResearchedFoodMacros,
): Promise<FoodItemDto> {
  const code =
    researched.sourceRef.startsWith("openfoodfacts:") && researched.sourceRef.includes(":")
      ? `AUTO_${researched.sourceRef.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase()}`.slice(0, 80)
      : autoCode(queryName);

  const aliases = [queryName, researched.name, researched.sourceLabel]
    .map((part) => normalizeFoodSearchQuery(part))
    .filter(Boolean)
    .join(" ");

  const searchText = normalizeFoodSearchQuery(
    `${researched.name} ${queryName} ${researched.sourceRef} ${aliases}`,
  );

  const category = `${researched.category} · ${researched.sourceLabel}`.slice(0, 120);

  const row = await prisma.foodOverride.upsert({
    where: { code },
    create: {
      code,
      name: researched.name,
      category,
      caloriesKcal: researched.caloriesKcal,
      proteinG: researched.proteinG,
      carbsG: researched.carbsG,
      fatG: researched.fatG,
      fiberG: researched.fiberG,
      sodiumMg: researched.sodiumMg,
      searchText,
    },
    update: {
      name: researched.name,
      category,
      caloriesKcal: researched.caloriesKcal,
      proteinG: researched.proteinG,
      carbsG: researched.carbsG,
      fatG: researched.fatG,
      fiberG: researched.fiberG,
      sodiumMg: researched.sodiumMg,
      searchText,
    },
  });

  console.log(
    `[FoodResearch] CUSTOM ${row.code} ← "${queryName}" via ${researched.sourceLabel} (${row.caloriesKcal} kcal/100g)`,
  );

  return toFoodItemDto(row);
}

async function findExistingAutoOverride(query: string): Promise<FoodItemDto | null> {
  const normalized = normalizeFoodSearchQuery(query);
  if (!normalized) return null;
  const tokens = normalized.split(" ").filter(Boolean).slice(0, 6);
  if (!tokens.length) return null;

  const row = await prisma.foodOverride.findFirst({
    where: {
      AND: [
        { code: { startsWith: "AUTO_" } },
        ...tokens.map((token) => ({ searchText: { contains: token } })),
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!row) return null;
  const dto = toFoodItemDto(row);
  if (isAbsurdFoodMatch(query, dto.name, dto.per100g)) return null;
  const sanitized = sanitizeResearchedPer100g({
    caloriesKcal: row.caloriesKcal,
    proteinG: row.proteinG,
    carbsG: row.carbsG,
    fatG: row.fatG,
    fiberG: row.fiberG,
  });
  if (!sanitized) return null;
  if (Math.abs(sanitized.caloriesKcal - row.caloriesKcal) > 5) {
    await prisma.foodOverride.update({
      where: { id: row.id },
      data: {
        caloriesKcal: sanitized.caloriesKcal,
        proteinG: sanitized.proteinG,
        carbsG: sanitized.carbsG,
        fatG: sanitized.fatG,
        fiberG: sanitized.fiberG,
      },
    });
    return toFoodItemDto({ ...row, ...sanitized });
  }
  return dto;
}

/**
 * Pesquisa fontes abertas (Open Food Facts → USDA) e cadastra FoodOverride CUSTOM.
 * Não inventa macros: só grava se a API retornar valores por 100 g e Atwater bater.
 */
export async function researchAndCreateCustomFood(
  rawName: string,
): Promise<FoodItemDto | null> {
  const query = cleanFoodMatchQuery(rawName) || rawName.trim();
  if (!query || shouldSkipResearch(query)) return null;

  const cacheKey = normalizeFoodSearchQuery(query);
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey) || null;

  const existing = await findExistingAutoOverride(query);
  if (existing) {
    memoryCache.set(cacheKey, existing);
    return existing;
  }

  try {
    const offProducts = await searchOpenFoodFacts(query);
    const offParsed = offProducts
      .map((product) => ({ product, macros: parseOffMacros(product, query) }))
      .filter(
        (entry): entry is { product: OffProduct; macros: ResearchedFoodMacros } =>
          Boolean(entry.macros),
      );

    if (offParsed.length) {
      const index = await pickBestCandidateIndex(
        query,
        offParsed.map((entry) => entry.macros.name),
      );
      if (index != null) {
        const created = await upsertCustomFromResearch(query, offParsed[index].macros);
        memoryCache.set(cacheKey, created);
        return created;
      }
    }

    const usdaFoods = await searchUsda(query);
    const usdaParsed = usdaFoods
      .map((food) => ({ food, macros: parseUsdaMacros(food, query) }))
      .filter(
        (entry): entry is { food: UsdaFood; macros: ResearchedFoodMacros } => Boolean(entry.macros),
      );

    if (usdaParsed.length) {
      const index = await pickBestCandidateIndex(
        query,
        usdaParsed.map((entry) => entry.macros.name),
      );
      if (index != null) {
        const created = await upsertCustomFromResearch(query, usdaParsed[index].macros);
        memoryCache.set(cacheKey, created);
        return created;
      }
    }

    memoryCache.set(cacheKey, null);
    return null;
  } catch (err) {
    console.error("[FoodResearch] falha ao pesquisar", { query, err });
    memoryCache.set(cacheKey, null);
    return null;
  }
}

export function isFoodAutoCustomEnabled(): boolean {
  const raw = process.env.FOOD_AUTO_CUSTOM?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
}
