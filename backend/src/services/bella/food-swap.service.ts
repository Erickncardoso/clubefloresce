import type { ParsedFoodItem, ParsedMeal, ParsedMealPlan } from "../../types/meal-plan.types";
import type { FoodItemDto } from "../../types/food.types";
import { FoodService } from "../food.service";
import { getMealPlanForUser } from "./meal-plan-context";
import {
  buildPlanItemLabel,
  canSwapWithinGroup,
  getSwapGroupLabel,
  inferMacroAnchor,
  isAbsurdSwap,
  resolveSwapGroup,
  type MacroAnchor,
  type SwapGroup,
} from "./food-category";
import type { SwapButtonOption } from "./swap-flow";
import { FoodRepository } from "../../repositories/food.repository";
import {
  formatMacrosShort,
  macrosAtGramsFromPer100g,
  normalizePer100gMacros,
  type NormalizedPer100g,
} from "../../utils/food-macros";
import { pickBestFoodForSwap } from "../../utils/swap-food-match";
import { buildSwapSearchQueries } from "../../utils/swap-search-queries";

const foodService = new FoodService();
const foodRepository = new FoodRepository();

export interface MacroSnapshot {
  grams: number;
  caloriesKcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
}

export interface SwapSuggestion {
  name: string;
  display: string;
  grams: number;
  category: string | null;
  source: "prescribed" | "food_bank";
  macros: MacroSnapshot;
}

export interface SwapOriginalContext {
  mealLabel: string;
  mealId: string;
  foodKey: string;
  item: ParsedFoodItem;
  matchedOriginal: FoodItemDto | null;
  originalCategory: string | null;
  originalSwapGroup: SwapGroup;
  originalMacros: MacroSnapshot;
  anchor: MacroAnchor;
}

export interface SwapAnalysisResult {
  mealLabel: string;
  originalSwapGroup: SwapGroup;
  original: {
    key: string;
    name: string;
    display: string;
    category: string | null;
    macros: MacroSnapshot;
  };
  suggestions: SwapSuggestion[];
  categoryBlocked: boolean;
}

function resolvePortionGrams(item: ParsedFoodItem): number {
  if (item.grams && item.grams > 0) return Math.round(item.grams);
  if (item.ml && item.ml > 0) return Math.round(item.ml);
  if (item.unit === "g" && item.amount) return Math.round(item.amount);
  if (item.unit === "ml" && item.amount) return Math.round(item.amount);

  const amount = item.amount || 1;
  switch (item.unit) {
    case "fatia":
      return Math.round(amount * 30);
    case "colher":
      return Math.round(amount * 15);
    case "xicara":
      return Math.round(amount * 160);
    case "unidade":
      return Math.round(amount * 100);
    case "file":
      return Math.round(amount * 120);
    case "porcao":
      return 100;
    case "avontade":
      return 80;
    default:
      return 100;
  }
}

function macrosAtGrams(food: FoodItemDto, grams: number): MacroSnapshot {
  return macrosAtGramsFromPer100g(normalizePer100gMacros(food), grams);
}

function gramsForEquivalentPortion(
  per100g: NormalizedPer100g,
  target: MacroSnapshot,
  anchor: MacroAnchor,
): number {
  if (anchor === "protein" && per100g.proteinG > 0 && per100g.caloriesKcal > 0) {
    const byProtein = (target.proteinG / per100g.proteinG) * 100;
    const byCalories = (target.caloriesKcal / per100g.caloriesKcal) * 100;
    return Math.max(10, Math.round(byProtein * 0.75 + byCalories * 0.25));
  }

  if (anchor === "carbs" && per100g.carbsG > 0 && per100g.caloriesKcal > 0) {
    const byCarbs = (target.carbsG / per100g.carbsG) * 100;
    const byCalories = (target.caloriesKcal / per100g.caloriesKcal) * 100;
    return Math.max(10, Math.round(byCarbs * 0.75 + byCalories * 0.25));
  }

  if (anchor === "fat" && per100g.fatG > 0 && per100g.caloriesKcal > 0) {
    const byFat = (target.fatG / per100g.fatG) * 100;
    const byCalories = (target.caloriesKcal / per100g.caloriesKcal) * 100;
    return Math.max(5, Math.round(byFat * 0.75 + byCalories * 0.25));
  }

  return gramsForAnchor(per100g, target, anchor);
}

function gramsForAnchor(
  per100g: NormalizedPer100g,
  target: MacroSnapshot,
  anchor: MacroAnchor,
): number {
  let targetValue = target.caloriesKcal;
  let per100Value = per100g.caloriesKcal;

  if (anchor === "carbs") {
    targetValue = target.carbsG;
    per100Value = per100g.carbsG;
  } else if (anchor === "protein") {
    targetValue = target.proteinG;
    per100Value = per100g.proteinG;
  } else if (anchor === "fat") {
    targetValue = target.fatG;
    per100Value = per100g.fatG;
  }

  if (targetValue <= 0 || per100Value <= 0) {
    return target.grams;
  }

  return Math.max(10, Math.round((targetValue / per100Value) * 100));
}

function macroDeviation(target: MacroSnapshot, candidate: MacroSnapshot): number {
  return (
    Math.abs(target.caloriesKcal - candidate.caloriesKcal) +
    Math.abs(target.carbsG - candidate.carbsG) * 4 +
    Math.abs(target.proteinG - candidate.proteinG) * 4 +
    Math.abs(target.fatG - candidate.fatG) * 9
  );
}

function buildSuggestionFromFood(
  food: FoodItemDto,
  target: MacroSnapshot,
  anchor: MacroAnchor,
  source: SwapSuggestion["source"],
): SwapSuggestion {
  const per100g = normalizePer100gMacros(food);
  const grams = gramsForEquivalentPortion(per100g, target, anchor);
  const macros = macrosAtGramsFromPer100g(per100g, grams);
  return {
    name: food.name,
    display: food.name,
    grams,
    category: food.category,
    source,
    macros,
  };
}

async function matchFoodForSwap(name: string, expectedGroup?: SwapGroup): Promise<FoodItemDto | null> {
  const queries = buildSwapSearchQueries(name);
  const merged = new Map<string, FoodItemDto>();

  for (const query of queries) {
    const { items } = await foodService.search({ q: query, limit: 35 });
    for (const item of items) {
      merged.set(item.id, item);
    }
  }

  const candidates = [...merged.values()];
  if (!candidates.length) return null;

  return pickBestFoodForSwap(name, candidates, {
    expectedGroup: expectedGroup && expectedGroup !== "mixed" ? expectedGroup : undefined,
  });
}

function findMeal(plan: ParsedMealPlan | null | undefined, mealId: string): ParsedMeal | null {
  if (!plan?.meals?.length) return null;
  return plan.meals.find((meal) => meal.id === mealId) || null;
}

function findFoodItem(meal: ParsedMeal, foodKey: string): ParsedFoodItem | null {
  return meal.items.find((item) => item.key === foodKey) || null;
}

export async function resolveSwapOriginalContext(
  userId: string,
  mealId: string,
  foodKey: string,
): Promise<SwapOriginalContext | null> {
  const record = await getMealPlanForUser(userId);
  const plan = record?.plan as ParsedMealPlan | undefined;
  const meal = findMeal(plan, mealId);
  const item = meal ? findFoodItem(meal, foodKey) : null;
  if (!meal || !item) return null;

  const portionGrams = resolvePortionGrams(item);
  const planLabel = buildPlanItemLabel(item);
  const provisionalGroup = resolveSwapGroup({ category: null, name: planLabel });
  const matchedOriginal = await matchFoodForSwap(
    item.name,
    provisionalGroup !== "mixed" ? provisionalGroup : undefined,
  );
  const normalizedPer100g = matchedOriginal ? normalizePer100gMacros(matchedOriginal) : undefined;
  const originalSwapGroup = resolveSwapGroup({
    category: matchedOriginal?.category ?? null,
    name: planLabel,
    per100g: normalizedPer100g,
  });
  const anchor = inferMacroAnchor(originalSwapGroup, normalizedPer100g);

  const originalMacros = matchedOriginal
    ? macrosAtGrams(matchedOriginal, portionGrams)
    : {
        grams: portionGrams,
        caloriesKcal: 0,
        carbsG: 0,
        proteinG: 0,
        fatG: 0,
      };

  return {
    mealLabel: meal.label,
    mealId,
    foodKey,
    item,
    matchedOriginal,
    originalCategory: matchedOriginal?.category || null,
    originalSwapGroup,
    originalMacros,
    anchor,
  };
}

export async function getSwapMealOptions(userId: string): Promise<SwapButtonOption[]> {
  const record = await getMealPlanForUser(userId);
  const plan = record?.plan as ParsedMealPlan | undefined;
  if (!plan?.meals?.length) return [];

  return plan.meals.map((meal) => ({
    id: meal.id,
    label: meal.time ? `${meal.label} (${meal.time})` : meal.label,
  }));
}

export async function getSwapFoodOptions(
  userId: string,
  mealId: string,
): Promise<{ mealLabel: string; options: SwapButtonOption[] } | null> {
  const record = await getMealPlanForUser(userId);
  const plan = record?.plan as ParsedMealPlan | undefined;
  const meal = findMeal(plan, mealId);
  if (!meal) return null;

  return {
    mealLabel: meal.label,
    options: (meal.items || []).map((item) => ({
      id: item.key,
      label: item.display || item.name,
    })),
  };
}

async function buildPrescribedSuggestions(
  item: ParsedFoodItem,
  ctx: SwapOriginalContext,
): Promise<SwapSuggestion[]> {
  const suggestions: SwapSuggestion[] = [];

  for (const sub of item.substitutions || []) {
    const matched = await matchFoodForSwap(sub.name, ctx.originalSwapGroup);
    if (!matched) continue;
    const subGroup = resolveSwapGroup({
      category: matched.category,
      name: matched.name,
      per100g: normalizePer100gMacros(matched),
    });
    if (!canSwapWithinGroup(ctx.originalSwapGroup, subGroup)) {
      continue;
    }
    suggestions.push(buildSuggestionFromFood(matched, ctx.originalMacros, ctx.anchor, "prescribed"));
  }

  return suggestions;
}

async function buildFoodBankSuggestions(ctx: SwapOriginalContext): Promise<SwapSuggestion[]> {
  if (ctx.originalSwapGroup === "mixed") return [];

  const candidates = await foodRepository.findForSwapGroup(ctx.originalSwapGroup, {
    excludeNames: [ctx.item.name, ctx.matchedOriginal?.name || ""].filter(Boolean),
    limit: 120,
  });

  return candidates
    .filter((food) => {
      if (/sandu[ií]che|picol[eé]|sorvete|hamb[uú]rguer.*p[aã]o/i.test(food.name)) return false;
      const group = resolveSwapGroup({
        category: food.category,
        name: food.name,
        per100g: normalizePer100gMacros(food),
      });
      return canSwapWithinGroup(ctx.originalSwapGroup, group);
    })
    .map((food) => {
      const suggestion = buildSuggestionFromFood(food, ctx.originalMacros, ctx.anchor, "food_bank");
      return { suggestion, deviation: macroDeviation(ctx.originalMacros, suggestion.macros) };
    })
    .sort((a, b) => a.deviation - b.deviation)
    .slice(0, 4)
    .map((entry) => entry.suggestion);
}

export async function buildSwapSuggestions(
  userId: string,
  mealId: string,
  foodKey: string,
): Promise<SwapAnalysisResult | null> {
  const ctx = await resolveSwapOriginalContext(userId, mealId, foodKey);
  if (!ctx) return null;

  const prescribed = await buildPrescribedSuggestions(ctx.item, ctx);
  const foodBank = await buildFoodBankSuggestions(ctx);
  const suggestions = [...prescribed, ...foodBank]
    .filter(
      (option, index, list) =>
        list.findIndex((entry) => entry.name === option.name) === index,
    )
    .slice(0, 5);

  return {
    mealLabel: ctx.mealLabel,
    originalSwapGroup: ctx.originalSwapGroup,
    original: {
      key: ctx.item.key,
      name: ctx.item.name,
      display: ctx.item.display || ctx.item.name,
      category: ctx.originalCategory,
      macros: ctx.originalMacros,
    },
    suggestions,
    categoryBlocked: ctx.originalSwapGroup === "mixed" && prescribed.length === 0,
  };
}

export async function buildCustomSwap(
  userId: string,
  mealId: string,
  foodKey: string,
  replacementName: string,
): Promise<
  | { ok: true; reply: string }
  | { ok: false; reply: string }
> {
  const ctx = await resolveSwapOriginalContext(userId, mealId, foodKey);
  if (!ctx) {
    return { ok: false, reply: "Não encontrei esse alimento no seu plano." };
  }

  const replacement = await matchFoodForSwap(replacementName.trim(), ctx.originalSwapGroup);
  if (!replacement) {
    return {
      ok: false,
      reply: `Não encontrei **${replacementName.trim()}** na base de alimentos. Tente outro nome ou peça sugestões.`,
    };
  }

  const replacementGroup = resolveSwapGroup({
    category: replacement.category,
    name: replacement.name,
    per100g: normalizePer100gMacros(replacement),
  });

  if (
    isAbsurdSwap(ctx.originalSwapGroup, replacementGroup) ||
    !canSwapWithinGroup(ctx.originalSwapGroup, replacementGroup)
  ) {
    return {
      ok: false,
      reply:
        `**${formatFoodTitle(replacement.name)}** não combina com **${ctx.item.name}**.\n\n` +
        `Troque por outra opção de **${getSwapGroupLabel(ctx.originalSwapGroup)}**.`,
    };
  }

  const suggestion = buildSuggestionFromFood(
    replacement,
    ctx.originalMacros,
    ctx.anchor,
    "food_bank",
  );

  return {
    ok: true,
    reply: formatCustomSwapReply(ctx, suggestion),
  };
}

function formatFoodTitle(name: string): string {
  return name.replace(/,/g, "").replace(/\s+/g, " ").trim();
}

function formatCustomSwapReply(ctx: SwapOriginalContext, replacement: SwapSuggestion): string {
  return (
    `**Substituição no plano**\n\n` +
    `**Sai**\n${ctx.item.display || ctx.item.name}\n${formatMacrosShort(ctx.originalMacros)}\n\n` +
    `**Entra**\n${formatFoodTitle(replacement.display)}\n${formatMacrosShort(replacement.macros)}`
  );
}

export function buildSuggestionButtonOptions(suggestions: SwapSuggestion[]): SwapButtonOption[] {
  return suggestions.map((option, index) => ({
    id: `suggestion-${index}`,
    label: formatFoodTitle(option.display),
  }));
}

export function formatSwapSuggestionsIntro(analysis: SwapAnalysisResult): string {
  const { original, suggestions, categoryBlocked } = analysis;

  if (categoryBlocked) {
    return `Não consegui classificar **${original.display}** na base de alimentos. Use as opções do plano ou fale com sua nutricionista.`;
  }

  if (!suggestions.length) {
    return `Não encontrei substitutos equivalentes para **${original.display}** (${getSwapGroupLabel(analysis.originalSwapGroup)}).`;
  }

  return (
    `**${original.display}**\n${formatMacrosShort(original.macros)}\n\n` +
    `**Opções equivalentes** — escolha uma opção abaixo:`
  );
}

export function formatSwapSuggestionsReply(analysis: SwapAnalysisResult): string {
  const { original, suggestions, categoryBlocked } = analysis;

  if (categoryBlocked || !suggestions.length) {
    return formatSwapSuggestionsIntro(analysis);
  }

  const lines = suggestions.map(
    (option, index) =>
      `**${index + 1}. ${formatFoodTitle(option.display)}**\n${formatMacrosShort(option.macros)}`,
  );

  return (
    `**${original.display}**\n${formatMacrosShort(original.macros)}\n\n` +
    `**Opções equivalentes:**\n\n${lines.join("\n\n")}`
  );
}

/** @deprecated use formatSwapSuggestionsReply */
export function formatSwapAnalysisReply(_firstName: string, analysis: SwapAnalysisResult): string {
  return formatSwapSuggestionsReply(analysis);
}

export { formatMacrosShort as formatMacroLine };
