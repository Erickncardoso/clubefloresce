import type { SwapGroup } from "./food-category";

export type MealPeriod = "breakfast" | "lunch" | "dinner" | "snack" | "any";

export type CarbRole =
  | "meal_staple"
  | "legume"
  | "breakfast_cereal"
  | "bread"
  | "other";

const MEAL_STAPLE_PATTERN =
  /\b(arroz|macarr[aã]o|batata|mandioca|aipim|macaxeira|inhame|baroa|cara\b|quinoa|polenta|cuscuz(?!\s+doce)|pur[eê]|nhoque|massa\b)\b/i;

const LEGUME_PATTERN =
  /\b(feij[aã]o|lentilha|gr[aã]o[- ]de[- ]bico|ervilha|soja\b|edamame)\b/i;

const BREAKFAST_CARB_PATTERN =
  /\b(aveia|canjica|mingau|granola|cuscuz\s+doce|muesli|farelo\s+de\s+aveia|flocos\s+de\s+milho|sucrilhos|corn\s+flakes|tapioca\s+cremosa|papinha|mingau\s+de)\b/i;

const BREAD_PATTERN =
  /\b(p[aã]o(?!\s+de\s+hamb)|torrada|bisnaguinha|wrap|tortilha|croissant|bagel)\b/i;

const DESSERT_OR_TREAT_PATTERN =
  /\b(picol[eé]|sorvete|brigadeiro|pudim|doce\s+de\s+leite|bolo\b|brownie|cookie|biscoito\s+recheado)\b/i;

const MAIN_MEAL_PERIODS = new Set<MealPeriod>(["lunch", "dinner"]);

export function resolveMealPeriod(mealLabel: string, mealId = ""): MealPeriod {
  const text = `${mealLabel} ${mealId}`.toLowerCase();
  if (/caf[eé]|desjejum|breakfast/.test(text)) return "breakfast";
  if (/almo[cç]o|lunch/.test(text)) return "lunch";
  if (/jantar|dinner|ceia/.test(text)) return "dinner";
  if (/lanche|snack|cola[cç][aã]o/.test(text)) return "snack";
  return "any";
}

export function resolveCarbRole(name: string): CarbRole {
  const text = name.trim();
  if (!text) return "other";
  if (BREAKFAST_CARB_PATTERN.test(text)) return "breakfast_cereal";
  if (BREAD_PATTERN.test(text)) return "bread";
  if (LEGUME_PATTERN.test(text)) return "legume";
  if (MEAL_STAPLE_PATTERN.test(text)) return "meal_staple";
  return "other";
}

function rolesCompatibleAtMeal(
  originalRole: CarbRole,
  substituteRole: CarbRole,
  mealPeriod: MealPeriod,
): boolean {
  if (originalRole === substituteRole && originalRole !== "other") return true;

  const isMainMeal = MAIN_MEAL_PERIODS.has(mealPeriod) || mealPeriod === "any";

  if (isMainMeal) {
    if (substituteRole === "breakfast_cereal") return false;
    if (originalRole === "meal_staple" && substituteRole === "bread") return false;

    if (originalRole === "meal_staple") {
      return substituteRole === "legume" || substituteRole === "meal_staple" || substituteRole === "other";
    }

    if (originalRole === "legume") {
      return substituteRole === "meal_staple" || substituteRole === "legume" || substituteRole === "other";
    }

    if (originalRole === "breakfast_cereal") {
      return substituteRole === "bread" || substituteRole === "other";
    }
  }

  if (mealPeriod === "breakfast") {
    if (originalRole === "breakfast_cereal" && substituteRole === "meal_staple") return false;
    if (originalRole === "breakfast_cereal" && substituteRole === "legume") return false;
    if (substituteRole === "meal_staple" && originalRole !== "meal_staple") return false;
    if (substituteRole === "legume") return false;
  }

  if (originalRole === "other" || substituteRole === "other") return true;

  return false;
}

export function isCulinarySwapAllowed(
  originalName: string,
  substituteName: string,
  mealPeriod: MealPeriod,
  swapGroup: SwapGroup,
): boolean {
  if (DESSERT_OR_TREAT_PATTERN.test(substituteName)) return false;
  if (swapGroup !== "carb_rich") return true;

  return rolesCompatibleAtMeal(
    resolveCarbRole(originalName),
    resolveCarbRole(substituteName),
    mealPeriod,
  );
}

export function scoreCulinarySwapFit(
  originalName: string,
  substituteName: string,
  mealPeriod: MealPeriod,
): number {
  const originalRole = resolveCarbRole(originalName);
  const subRole = resolveCarbRole(substituteName);
  let score = 0;

  if (originalRole === subRole && originalRole !== "other") score += 60;

  if (/arroz/i.test(originalName) && /batata|mandioca|quinoa|macarr[aã]o|pur[eê]|polenta|inhame/i.test(substituteName)) {
    score += 35;
  }

  if (/feij[aã]o/i.test(originalName) && /feij[aã]o|lentilha|gr[aã]o/i.test(substituteName)) {
    score += 30;
  }

  if (MAIN_MEAL_PERIODS.has(mealPeriod) || mealPeriod === "any") {
    if (subRole === "breakfast_cereal") score -= 200;
    if (BREAKFAST_CARB_PATTERN.test(substituteName)) score -= 150;
  }

  if (mealPeriod === "breakfast" && subRole === "meal_staple" && originalRole === "breakfast_cereal") {
    score -= 100;
  }

  return score;
}

export function buildCulinarySwapRejection(
  originalName: string,
  substituteName: string,
  mealPeriod: MealPeriod,
): string {
  const periodLabel =
    mealPeriod === "lunch"
      ? "no almoço"
      : mealPeriod === "dinner"
        ? "no jantar"
        : mealPeriod === "breakfast"
          ? "no café da manhã"
          : "nesta refeição";

  return (
    `**${substituteName.trim()}** não faz sentido como troca de **${originalName.trim()}** ${periodLabel}.\n\n` +
    "Escolha algo do **mesmo papel no prato** — por exemplo, arroz troca por batata, mandioca, quinoa ou outro cereal do almoço/jantar, não por mingau ou canjica."
  );
}
