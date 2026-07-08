import { Prisma, FoodSource, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { FoodItemDto } from "../types/food.types";
import {
  getCategoriesForSwapGroup,
  resolveSwapGroup,
  type SwapGroup,
} from "../services/bella/food-category";
import { normalizePer100gMacros } from "../utils/food-macros";
import {
  expandTokenSynonyms,
  normalizeFoodSearchQuery,
  pickBestFoodMatch,
  scoreFoodSearchResult,
  tokenizeFoodQuery,
} from "../utils/food-search";
import { scoreFoodForSwapMatch } from "../utils/swap-food-match";

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
    const rows = await prisma.foodOverride.findMany({
      where: { searchText: { contains: normalizedQuery } },
      take: Math.min(limit * 2, 20),
      orderBy: [{ name: "asc" }],
    });
    return rows.map((row) => this.mapOverride(row as any));
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

  async findById(id: string) {
    const item = await prisma.foodItem.findUnique({ where: { id } });
    return item ? mapFood(item) : null;
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

    const rows = await prisma.foodItem.findMany({
      where,
      take: Math.min(limit * 4, 120),
    });

    const baseItems = rows
      .map(mapFood)
      .sort((a, b) => scoreFoodSearchResult(trimmed, b.name, b.source) - scoreFoodSearchResult(trimmed, a.name, a.source))
      .slice(0, limit);

    const overrideItems = await this.searchOverrides(normalized, limit);
    const merged = new Map<string, FoodItemDto>();
    for (const item of [...overrideItems, ...baseItems]) {
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
