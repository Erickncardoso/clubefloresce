import { Prisma, FoodSource, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { FoodCatalogItemDto, FoodCatalogMetaDto, FoodItemDto } from "../types/food.types";
import {
  getCategoriesForSwapGroup,
  resolveSwapGroup,
  type SwapGroup,
} from "../services/bella/food-category";
import { normalizePer100gMacros } from "../utils/food-macros";
import { getFoodDisplayName, getFoodSearchAliasText } from "../utils/food-catalog-aliases";
import { scoreFoodForMealPlanSearch } from "../utils/food-meal-plan-search";
import {
  countMatchingFoodTokens,
  expandTokenSynonyms,
  minRelaxedTokenMatches,
  normalizeFoodSearchQuery,
  pickBestFoodMatch,
  scoreFoodSearchResult,
  tokenizeFoodQuery,
} from "../utils/food-search";
import { scoreFoodForSwapMatch } from "../utils/swap-food-match";
import { extractFoodMatchCandidates } from "../utils/food-meal-plan-match-candidates";

const MEAL_PLAN_MATCH_MIN_SCORE = 45;

function mapFood(item: {
  id: string;
  source: FoodSource;
  sourceCode: string;
  name: string;
  category: string | null;
  nutrients: Prisma.JsonValue;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sodiumMg: number | null;
}): FoodItemDto {
  const nutrients = (item.nutrients || {}) as FoodItemDto["nutrients"];
  return {
    id: item.id,
    source: item.source,
    sourceCode: item.sourceCode,
    name: item.name,
    displayName: getFoodDisplayName(item.name, item.source, item.sourceCode),
    category: item.category,
    nutrients,
    per100g: {
      caloriesKcal: item.caloriesKcal,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      fiberG: item.fiberG,
      sodiumMg: item.sodiumMg,
    },
  };
}

export { normalizeFoodSearchQuery } from "../utils/food-search";

function buildTokenSearchWhere(query: string, source?: FoodSource): Prisma.FoodItemWhereInput {
  const tokens = tokenizeFoodQuery(query);
  const where: Prisma.FoodItemWhereInput = source ? { source } : {};

  if (!tokens.length) return where;

  where.AND = tokens.map((token) => {
    const variants = expandTokenSynonyms(token);
    if (variants.length === 1) {
      return { searchText: { contains: variants[0] } };
    }
    return {
      OR: variants.map((variant) => ({ searchText: { contains: variant } })),
    };
  });

  return where;
}

function buildRelaxedTokenSearchWhere(query: string, source?: FoodSource): Prisma.FoodItemWhereInput {
  const tokens = tokenizeFoodQuery(query);
  const where: Prisma.FoodItemWhereInput = source ? { source } : {};
  if (!tokens.length) return where;

  where.OR = tokens.flatMap((token) => {
    const variants = expandTokenSynonyms(token);
    return variants.map((variant) => ({ searchText: { contains: variant } }));
  });

  return where;
}

function rankFoodSearchResults(trimmed: string, items: FoodItemDto[], limit: number): FoodItemDto[] {
  return items
    .sort(
      (a, b) =>
        scoreFoodForMealPlanSearch(trimmed, b.name, b.source, b.sourceCode) -
        scoreFoodForMealPlanSearch(trimmed, a.name, a.source, a.sourceCode),
    )
    .slice(0, limit);
}

function filterRelaxedFoodMatches(query: string, items: FoodItemDto[]): FoodItemDto[] {
  const tokens = tokenizeFoodQuery(query);
  if (tokens.length <= 1) return items;

  const minMatches = minRelaxedTokenMatches(tokens.length);
  return items.filter((item) => countMatchingFoodTokens(query, item.name) >= minMatches);
}

export class FoodRepository {
  private mapOverride(row: {
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
    searchText: string;
  }): FoodItemDto {
    return {
      id: row.id,
      source: "CUSTOM",
      sourceCode: row.code,
      name: row.name,
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

  private async searchOverrides(normalizedQuery: string, limit: number): Promise<FoodItemDto[]> {
    if (!normalizedQuery) return [];

    const tokens = tokenizeFoodQuery(normalizedQuery);
    const where =
      tokens.length > 1
        ? {
            AND: tokens.map((token) => ({
              searchText: { contains: token },
            })),
          }
        : { searchText: { contains: normalizedQuery } };

    const rows = await prisma.foodOverride.findMany({
      where,
      take: Math.min(limit * 3, 40),
      orderBy: [{ name: "asc" }],
    });

    return rows
      .map((row) => this.mapOverride(row as any))
      .sort(
        (a, b) =>
          scoreFoodSearchResult(normalizedQuery, b.name, "CUSTOM") -
          scoreFoodSearchResult(normalizedQuery, a.name, "CUSTOM"),
      );
  }

  private async findExactOverride(name: string): Promise<FoodItemDto | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const exact = await prisma.foodOverride.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
    });
    return exact ? this.mapOverride(exact as any) : null;
  }

  async countBySource() {
    return prisma.foodItem.groupBy({
      by: ["source"],
      _count: { _all: true },
    });
  }

  async getCatalogMeta(): Promise<FoodCatalogMetaDto> {
    const [foodCount, overrideCount, foodAgg, overrideAgg] = await Promise.all([
      prisma.foodItem.count(),
      prisma.foodOverride.count(),
      prisma.foodItem.aggregate({ _max: { updatedAt: true } }),
      prisma.foodOverride.aggregate({ _max: { updatedAt: true } }),
    ]);

    const foodUpdated = foodAgg._max.updatedAt;
    const overrideUpdated = overrideAgg._max.updatedAt;
    const latest =
      foodUpdated && overrideUpdated
        ? foodUpdated > overrideUpdated
          ? foodUpdated
          : overrideUpdated
        : foodUpdated || overrideUpdated || null;

    return {
      version: `${foodCount}:${overrideCount}:${latest?.toISOString() || "0"}`,
      total: foodCount + overrideCount,
      foodCount,
      overrideCount,
      updatedAt: latest?.toISOString() || null,
    };
  }

  async listCatalogItems(): Promise<FoodCatalogItemDto[]> {
    const [rows, overrides] = await Promise.all([
      prisma.foodItem.findMany({
        select: {
          id: true,
          source: true,
          sourceCode: true,
          name: true,
          category: true,
          searchText: true,
          caloriesKcal: true,
          proteinG: true,
          carbsG: true,
          fatG: true,
          fiberG: true,
          sodiumMg: true,
        },
        orderBy: [{ source: "desc" }, { name: "asc" }],
      }),
      prisma.foodOverride.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          searchText: true,
          caloriesKcal: true,
          proteinG: true,
          carbsG: true,
          fatG: true,
          fiberG: true,
          sodiumMg: true,
        },
        orderBy: [{ name: "asc" }],
      }),
    ]);

    const catalogItems = rows.map((item) => ({
      id: item.id,
      source: item.source,
      sourceCode: item.sourceCode,
      name: item.name,
      displayName: getFoodDisplayName(item.name, item.source, item.sourceCode),
      category: item.category,
      searchText: item.searchText,
      per100g: {
        caloriesKcal: item.caloriesKcal,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
        fiberG: item.fiberG,
        sodiumMg: item.sodiumMg,
      },
    }));

    const overrideItems = overrides.map((row) => ({
      id: row.id,
      source: "CUSTOM" as const,
      sourceCode: row.code,
      name: row.name,
      displayName: row.name,
      category: row.category,
      searchText: row.searchText,
      per100g: {
        caloriesKcal: row.caloriesKcal,
        proteinG: row.proteinG,
        carbsG: row.carbsG,
        fatG: row.fatG,
        fiberG: row.fiberG,
        sodiumMg: row.sodiumMg,
      },
    }));

    return [...overrideItems, ...catalogItems];
  }

  async findById(id: string) {
    const item = await prisma.foodItem.findUnique({ where: { id } });
    if (item) return mapFood(item);

    const override = await prisma.foodOverride.findUnique({ where: { id } });
    return override ? this.mapOverride(override as any) : null;
  }

  async findExactMatch(name: string, source?: FoodSource) {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const override = await this.findExactOverride(trimmed);
    if (override) return override;

    const exact = await prisma.foodItem.findFirst({
      where: {
        ...(source ? { source } : {}),
        name: { equals: trimmed, mode: "insensitive" },
      },
      orderBy: [{ source: "desc" }, { name: "asc" }],
    });
    if (exact) return mapFood(exact);

    const normalized = normalizeFoodSearchQuery(trimmed);
    const fuzzy = await prisma.foodItem.findFirst({
      where: {
        ...(source ? { source } : {}),
        searchText: { equals: normalized },
      },
      orderBy: [{ source: "desc" }, { name: "asc" }],
    });

    return fuzzy ? mapFood(fuzzy) : null;
  }

  async findByPrimaryIngredient(query: string, limit = 25): Promise<FoodItemDto[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const normalized = normalizeFoodSearchQuery(trimmed);
    const titleCase = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();

    const rows = await prisma.foodItem.findMany({
      where: {
        OR: [
          { name: { startsWith: `${titleCase},`, mode: "insensitive" } },
          { name: { startsWith: `${trimmed},`, mode: "insensitive" } },
          { name: { equals: titleCase, mode: "insensitive" } },
          { name: { equals: trimmed, mode: "insensitive" } },
          { searchText: { startsWith: normalized } },
        ],
      },
      take: Math.min(limit * 3, 80),
      orderBy: [{ source: "desc" }, { name: "asc" }],
    });

    return rows
      .map(mapFood)
      .sort(
        (a, b) =>
          scoreFoodForSwapMatch(trimmed, b.name, b.source) -
          scoreFoodForSwapMatch(trimmed, a.name, a.source),
      )
      .slice(0, limit);
  }

  async findBestMatch(name: string, source?: FoodSource) {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const exact = await this.findExactMatch(trimmed, source);
    if (exact) return exact;

    const { items } = await this.search({ q: trimmed, source, limit: 30 });
    return pickBestFoodMatch(trimmed, items);
  }

  /**
   * Match para plano alimentar: busca em TBCA + TACO + overrides CUSTOM (Florescer)
   * e escolhe o melhor score entre todas as fontes — sem priorizar TBCA cegamente.
   */
  async findBestMealPlanMatch(name: string): Promise<FoodItemDto | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const candidates = extractFoodMatchCandidates(trimmed);
    const merged = new Map<string, FoodItemDto>();

    for (const candidate of candidates) {
      const exact = await this.findExactMatch(candidate);
      if (exact) merged.set(exact.id, exact);

      const { items } = await this.search({ q: candidate, limit: 30 });
      for (const item of items) merged.set(item.id, item);
    }

    const pool = [...merged.values()];
    if (!pool.length) return null;

    let best: FoodItemDto | null = null;
    let bestScore = MEAL_PLAN_MATCH_MIN_SCORE - 1;

    for (const item of pool) {
      let itemScore = 0;
      for (const candidate of [trimmed, ...candidates]) {
        itemScore = Math.max(
          itemScore,
          scoreFoodForMealPlanSearch(candidate, item.name, item.source, item.sourceCode),
        );
      }
      if (itemScore > bestScore) {
        bestScore = itemScore;
        best = item;
      }
    }

    return best;
  }

  async search(input: { q: string; source?: FoodSource; limit?: number }) {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
    const trimmed = input.q.trim();
    const normalized = normalizeFoodSearchQuery(trimmed);

    let where: Prisma.FoodItemWhereInput = input.source ? { source: input.source } : {};

    if (normalized) {
      const phraseWhere: Prisma.FoodItemWhereInput = {
        ...(input.source ? { source: input.source } : {}),
        searchText: { contains: normalized },
      };
      const tokenWhere = buildTokenSearchWhere(trimmed, input.source);

      where =
        tokenizeFoodQuery(trimmed).length > 0
          ? { OR: [phraseWhere, tokenWhere] }
          : phraseWhere;
    }

    const queryTokens = tokenizeFoodQuery(trimmed);
    const fetchTake = queryTokens.length <= 2
      ? Math.min(Math.max(limit * 20, 120), 250)
      : Math.min(limit * 8, 200);

    let rows = await prisma.foodItem.findMany({
      where,
      take: fetchTake,
    });

    if (!rows.length && queryTokens.length > 1) {
      rows = await prisma.foodItem.findMany({
        where: buildRelaxedTokenSearchWhere(trimmed, input.source),
        take: Math.min(Math.max(limit * 20, 120), 250),
      });
    }

    const mappedRows = rows.map(mapFood);
    const strictItems = rankFoodSearchResults(trimmed, mappedRows, limit);
    const relaxedItems =
      strictItems.length > 0
        ? strictItems
        : rankFoodSearchResults(trimmed, filterRelaxedFoodMatches(trimmed, mappedRows), limit);

    const overrideItems = await this.searchOverrides(normalized, limit);
    const merged = new Map<string, FoodItemDto>();
    for (const item of [...overrideItems, ...relaxedItems]) {
      merged.set(item.id, item);
    }

    const items = Array.from(merged.values()).slice(0, limit);
    const total = await prisma.foodItem.count({ where });

    return { items, total };
  }

  async findByCategory(
    category: string,
    options?: { excludeNames?: string[]; limit?: number },
  ) {
    const limit = Math.min(Math.max(options?.limit ?? 40, 1), 100);
    const excludeNames = (options?.excludeNames || [])
      .map((name) => name.trim())
      .filter(Boolean);

    const rows = await prisma.foodItem.findMany({
      where: {
        category,
        ...(excludeNames.length
          ? {
              NOT: {
                OR: excludeNames.map((name) => ({
                  name: { equals: name, mode: "insensitive" as const },
                })),
              },
            }
          : {}),
      },
      orderBy: [{ source: "desc" }, { name: "asc" }],
      take: limit,
    });

    return rows.map(mapFood);
  }

  async findForSwapGroup(
    group: SwapGroup,
    options?: { excludeNames?: string[]; limit?: number },
  ) {
    const categories = getCategoriesForSwapGroup(group);
    if (!categories.length) return [];

    const limit = Math.min(Math.max(options?.limit ?? 80, 1), 200);
    const excludeNames = (options?.excludeNames || [])
      .map((name) => name.trim())
      .filter(Boolean);

    const rows = await prisma.foodItem.findMany({
      where: {
        category: { in: categories },
        ...(excludeNames.length
          ? {
              NOT: {
                OR: excludeNames.map((name) => ({
                  name: { equals: name, mode: "insensitive" as const },
                })),
              },
            }
          : {}),
      },
      orderBy: [{ source: "desc" }, { name: "asc" }],
      take: limit,
    });

    return rows
      .map(mapFood)
      .filter(
        (food) =>
          resolveSwapGroup({
            category: food.category,
            name: food.name,
            per100g: normalizePer100gMacros(food),
          }) === group,
      );
  }
}
