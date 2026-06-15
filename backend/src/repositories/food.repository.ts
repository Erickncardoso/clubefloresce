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

    const exact = await prisma.foodItem.findFirst({
      where: {
        ...(source ? { source } : {}),
        name: { equals: trimmed, mode: "insensitive" },
      },
      orderBy: [{ source: "asc" }, { name: "asc" }],
    });
    if (exact) return mapFood(exact);

    const normalized = normalizeFoodSearchQuery(trimmed);
    const fuzzy = await prisma.foodItem.findFirst({
      where: {
        ...(source ? { source } : {}),
        searchText: { equals: normalized },
      },
      orderBy: [{ source: "asc" }, { name: "asc" }],
    });

    return fuzzy ? mapFood(fuzzy) : null;
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

    const items = rows
      .map(mapFood)
      .sort((a, b) => scoreFoodSearchResult(trimmed, b.name, b.source) - scoreFoodSearchResult(trimmed, a.name, a.source))
      .slice(0, limit);

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
      orderBy: [{ source: "asc" }, { name: "asc" }],
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
      orderBy: [{ source: "asc" }, { name: "asc" }],
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
