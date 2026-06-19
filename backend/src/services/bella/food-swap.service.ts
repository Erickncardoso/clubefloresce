import type { ParsedFoodItem, ParsedMeal, ParsedMealPlan } from "../../types/meal-plan.types";
import type { FoodItemDto } from "../../types/food.types";
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
} from "../../utils/food-macros";
import { formatFoodDisplayName } from "../../utils/food-display";
import { smartMatchFood } from "../food-smart-match.service";
import {
  buildNutrientVector,
  readFiberG,
  scoreNutritionalSimilarity,
  similarityToPercent,
} from "../../utils/swap-cosine-similarity";
import { buildEquivalentPortion } from "../../utils/swap-portion-equivalence";
import {
  buildCulinarySwapRejection,
  isCulinarySwapAllowed,
  resolveMealPeriod,
  scoreCulinarySwapFit,
} from "./swap-culinary-fit";
import {
  isPreparationSwapAllowed,
  scorePreparationSwapFit,
  buildPrepSwapRejection,
} from "./swap-prep-state";

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
  mealPeriod: ReturnType<typeof resolveMealPeriod>;
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

function buildSuggestionFromFood(
  food: FoodItemDto,
  target: MacroSnapshot,
  anchor: MacroAnchor,
  source: SwapSuggestion["source"],
): SwapSuggestion {
  const per100g = normalizePer100gMacros(food);
  const macros = buildEquivalentPortion(per100g, target, anchor);
  return {
    name: food.name,
    display: formatFoodDisplayName(food.name),
    grams: macros.grams,
    category: food.category,
    source,
    macros,
  };
}

async function matchFoodForSwap(
  name: string,
  expectedGroup?: SwapGroup,
  originalName?: string,
): Promise<FoodItemDto | null> {
  return smartMatchFood(name, {
    expectedGroup: expectedGroup && expectedGroup !== "mixed" ? expectedGroup : undefined,
    originalName,
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
    planLabel,
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
    mealPeriod: resolveMealPeriod(meal.label, meal.id),
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
    const matched = await matchFoodForSwap(sub.name, ctx.originalSwapGroup, buildPlanItemLabel(item));
    if (!matched) continue;
    if (
      !isCulinarySwapAllowed(
        buildPlanItemLabel(item),
        matched.name,
        ctx.mealPeriod,
        ctx.originalSwapGroup,
      )
      || !isPreparationSwapAllowed(buildPlanItemLabel(item), matched.name)
    ) {
      continue;
    }
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

  const originalLabel = buildPlanItemLabel(ctx.item);

  const candidates = await foodRepository.findForSwapGroup(ctx.originalSwapGroup, {
    excludeNames: [ctx.item.name, ctx.matchedOriginal?.name || ""].filter(Boolean),
    limit: 160,
  });

  const originalPer100g = ctx.matchedOriginal
    ? normalizePer100gMacros(ctx.matchedOriginal)
    : null;
  const originalVector = originalPer100g
    ? buildNutrientVector(
        originalPer100g,
        ctx.originalMacros.grams,
        ctx.matchedOriginal ? readFiberG(ctx.matchedOriginal) : 0,
      )
    : null;

  return candidates
    .filter((food) => {
      if (/sandu[ií]che|picol[eé]|sorvete|hamb[uú]rguer.*p[aã]o/i.test(food.name)) return false;
      if (
        !isCulinarySwapAllowed(
          originalLabel,
          food.name,
          ctx.mealPeriod,
          ctx.originalSwapGroup,
        )
        || !isPreparationSwapAllowed(originalLabel, food.name)
      ) {
        return false;
      }
      const group = resolveSwapGroup({
        category: food.category,
        name: food.name,
        per100g: normalizePer100gMacros(food),
      });
      return canSwapWithinGroup(ctx.originalSwapGroup, group);
    })
    .map((food) => {
      const suggestion = buildSuggestionFromFood(food, ctx.originalMacros, ctx.anchor, "food_bank");
      const per100g = normalizePer100gMacros(food);
      const candidateVector = buildNutrientVector(
        per100g,
        suggestion.macros.grams,
        readFiberG(food),
      );
      const cosineScore = originalVector
        ? scoreNutritionalSimilarity(originalVector, candidateVector, ctx.anchor)
        : 0;
      const culinary = scoreCulinarySwapFit(originalLabel, food.name, ctx.mealPeriod);
      const prep = scorePreparationSwapFit(originalLabel, food.name);
      return {
        suggestion,
        score: similarityToPercent(cosineScore) + culinary * 0.15 + prep * 0.1,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
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

  const originalLabel = buildPlanItemLabel(ctx.item);
  const replacement = await matchFoodForSwap(
    replacementName.trim(),
    ctx.originalSwapGroup,
    originalLabel,
  );
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

  const culinaryOk = isCulinarySwapAllowed(
    buildPlanItemLabel(ctx.item),
    replacement.name,
    ctx.mealPeriod,
    ctx.originalSwapGroup,
  );
  const groupOk =
    !isAbsurdSwap(ctx.originalSwapGroup, replacementGroup) &&
    canSwapWithinGroup(ctx.originalSwapGroup, replacementGroup);

  if (!culinaryOk) {
    return {
      ok: false,
      reply: buildCulinarySwapRejection(
        ctx.item.display || ctx.item.name,
        replacement.name,
        ctx.mealPeriod,
      ),
    };
  }

  if (!isPreparationSwapAllowed(originalLabel, replacement.name)) {
    return {
      ok: false,
      reply: buildPrepSwapRejection(originalLabel, replacement.name),
    };
  }

  if (!groupOk) {
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
  return formatFoodDisplayName(name);
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
