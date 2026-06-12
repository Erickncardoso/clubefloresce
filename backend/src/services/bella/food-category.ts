import type { NormalizedPer100g } from "../../utils/food-macros";

/** Grupo funcional para trocas (macro principal do alimento). */
export type SwapGroup =
  | "carb_rich"
  | "protein_rich"
  | "fat_rich"
  | "fruit"
  | "vegetable"
  | "dairy"
  | "mixed";

export const SWAP_GROUP_LABELS: Record<SwapGroup, string> = {
  carb_rich: "alimentos ricos em carboidrato (cereais, tubérculos, leguminosas)",
  protein_rich: "proteínas (carnes, frango, peixe, ovo)",
  fat_rich: "alimentos ricos em gordura (óleos, oleaginosas, sementes)",
  fruit: "frutas",
  vegetable: "verduras e hortaliças",
  dairy: "leite e derivados",
  mixed: "mesmo tipo de alimento",
};

const TUBER_PATTERN =
  /\b(batata|mandioca|aipim|macaxeira|inhame|cara|baroa)\b/i;

const CARB_NAME_PATTERN =
  /\b(arroz|macarr[aã]o|milho|p[aã]o(?!\s+de\s+hamb)|tapioca|quinoa|aveia|farinha|cuscuz|polenta|granola|biscoito|torrada|wrap|tortilla|feij[aã]o|lentilha|gr[aã]o|grao)\b/i;

/** Carnes, aves, peixes e ovos — prioridade alta na classificação. */
const PROTEIN_ANIMAL_PATTERN =
  /\b(patinho|alcatra|picanha|contrafil[eé]|maminha|ac[eé]m|bovina|boi\b|su[ií]na|porco|lombo|pernil|frango|galinha|peixe|salm[aã]o|atum|sardinha|til[aá]pia|merluza|bacalhau|camar[aã]o|ovo|omelete|tofu|hamb[uú]rguer bovino|hamb[uú]rguer de frango|carne\b|mo[ií]do|m[ií]oido|file\b|fil[eé]|peito de frango|peito de peru|sobrecoxa|coxa\b|lingu[ií]ca|presunto|mortadela|salsicha|bacon|kafta|isca de peixe)\b/i;

const FRUIT_NAME_PATTERN =
  /\b(mam[aã]o|banana|ma[cç][aã]|laranja|uva|morango|abacaxi|manga|melancia|mel[aã]o|kiwi|pera|goiaba|a[cç]a[ií]|lim[aã]o)\b/i;

const VEG_NAME_PATTERN =
  /\b(br[oó]colis|couve|espinafre|alface|tomate|pepino|abobrinha|berinjela|repolho|vagem|r[uú]cula|cenoura|beterraba|chuchu)\b/i;

const FAT_NAME_PATTERN =
  /\b(azeite|[oó]leo\b|castanha|amendoim|noz\b|semente|abacate|manteiga|creme de leite|margarina)\b/i;

const DESSERT_PATTERN = /\b(picol[eé]|sorvete|gelato|pudim|doce de leite|brigadeiro|brownie)\b/i;

export function getSwapGroupLabel(group: SwapGroup | null): string {
  if (!group) return "mesmo grupo nutricional";
  return SWAP_GROUP_LABELS[group];
}

export function getCategoriesForSwapGroup(group: SwapGroup): string[] {
  switch (group) {
    case "carb_rich":
      return [
        "Cereais e derivados",
        "Leguminosas e derivados",
        "Verduras, hortaliças e derivados",
        "Miscelâneas",
      ];
    case "protein_rich":
      return [
        "Carnes e derivados",
        "Pescados e frutos do mar",
        "Ovos e derivados",
      ];
    case "fat_rich":
      return ["Gorduras e óleos", "Nozes e sementes"];
    case "fruit":
      return ["Frutas e derivados"];
    case "vegetable":
      return ["Verduras, hortaliças e derivados"];
    case "dairy":
      return ["Leite e derivados"];
    default:
      return [];
  }
}

function dominantMacro(per100g: NormalizedPer100g): "carbs" | "protein" | "fat" | "calories" {
  const carbKcal = per100g.carbsG * 4;
  const protKcal = per100g.proteinG * 4;
  const fatKcal = per100g.fatG * 9;
  const max = Math.max(carbKcal, protKcal, fatKcal);
  if (max <= 0) return "calories";
  if (max === carbKcal) return "carbs";
  if (max === protKcal) return "protein";
  return "fat";
}

function isCarbRichByMacros(per100g: NormalizedPer100g): boolean {
  if (dominantMacro(per100g) !== "carbs") return false;
  return per100g.carbsG >= 10 && per100g.carbsG >= per100g.proteinG * 1.3;
}

function isProteinRichByMacros(per100g: NormalizedPer100g): boolean {
  if (dominantMacro(per100g) !== "protein") return false;
  return per100g.proteinG >= 6;
}

function isFatRichByMacros(per100g: NormalizedPer100g): boolean {
  if (dominantMacro(per100g) !== "fat") return false;
  return per100g.fatG >= 5;
}

function categoryToGroup(category: string): SwapGroup | null {
  const cat = category.toLowerCase();
  if (/carnes|pescados|ovos/.test(cat)) return "protein_rich";
  if (/cereais|leguminosas/.test(cat)) return "carb_rich";
  if (/gorduras|nozes|sementes/.test(cat)) return "fat_rich";
  if (/frutas/.test(cat)) return "fruit";
  if (/verduras|hortali/.test(cat)) return "vegetable";
  if (/leite/.test(cat)) return "dairy";
  return null;
}

export function resolveSwapGroup(input: {
  category: string | null;
  name: string;
  per100g?: NormalizedPer100g;
}): SwapGroup {
  const name = input.name.trim();
  const cat = (input.category || "").toLowerCase();

  if (DESSERT_PATTERN.test(name)) {
    return /picol[eé]|sorvete/i.test(name) ? "carb_rich" : "carb_rich";
  }

  if (FAT_NAME_PATTERN.test(name)) return "fat_rich";

  if (PROTEIN_ANIMAL_PATTERN.test(name)) return "protein_rich";

  if (FRUIT_NAME_PATTERN.test(name) && !TUBER_PATTERN.test(name)) return "fruit";

  if (TUBER_PATTERN.test(name) || CARB_NAME_PATTERN.test(name)) return "carb_rich";

  const fromCategory = input.category ? categoryToGroup(input.category) : null;
  if (fromCategory === "protein_rich") return "protein_rich";
  if (fromCategory === "fat_rich") return "fat_rich";
  if (fromCategory === "fruit") return "fruit";
  if (fromCategory === "dairy") return "dairy";

  if (/a[cç][uú]car|produtos a.uucarados/.test(cat)) return "carb_rich";
  if (/cereais|leguminosas/.test(cat)) return "carb_rich";
  if (/gorduras|nozes|sementes/.test(cat)) return "fat_rich";
  if (/frutas/.test(cat) && !TUBER_PATTERN.test(name)) return "fruit";
  if (/leite/.test(cat)) return "dairy";

  if (/verduras|hortali/.test(cat)) {
    if (TUBER_PATTERN.test(name)) return "carb_rich";
    if (input.per100g && isCarbRichByMacros(input.per100g)) return "carb_rich";
    if (VEG_NAME_PATTERN.test(name)) return "vegetable";
    if (input.per100g && input.per100g.caloriesKcal <= 60) return "vegetable";
    return "vegetable";
  }

  if (/carnes|pescados|ovos/.test(cat)) return "protein_rich";

  if (input.per100g) {
    if (isProteinRichByMacros(input.per100g)) return "protein_rich";
    if (isFatRichByMacros(input.per100g)) return "fat_rich";
    if (isCarbRichByMacros(input.per100g)) return "carb_rich";
    if (input.per100g.caloriesKcal <= 50) return "vegetable";
  }

  if (fromCategory) return fromCategory;

  return "mixed";
}

export function canSwapWithinGroup(original: SwapGroup, substitute: SwapGroup): boolean {
  if (original === substitute) return true;
  if (original === "mixed" || substitute === "mixed") return false;
  return false;
}

export function isAbsurdSwap(original: SwapGroup, substitute: SwapGroup): boolean {
  const incompatible: Array<[SwapGroup, SwapGroup]> = [
    ["fat_rich", "fruit"],
    ["fat_rich", "vegetable"],
    ["fat_rich", "protein_rich"],
    ["fruit", "protein_rich"],
    ["fruit", "fat_rich"],
    ["vegetable", "fruit"],
    ["vegetable", "carb_rich"],
    ["dairy", "fruit"],
    ["dairy", "fat_rich"],
  ];

  return incompatible.some(
    ([a, b]) =>
      (original === a && substitute === b) || (original === b && substitute === a),
  );
}

export type MacroAnchor = "carbs" | "protein" | "fat" | "calories";

export function inferMacroAnchor(
  swapGroup: SwapGroup | null,
  per100g?: NormalizedPer100g,
): MacroAnchor {
  if (swapGroup === "carb_rich" || swapGroup === "fruit") return "carbs";
  if (swapGroup === "protein_rich") return "protein";
  if (swapGroup === "fat_rich") return "fat";
  if (swapGroup === "dairy") return "protein";
  if (swapGroup === "vegetable") return "calories";

  if (per100g) {
    const macro = dominantMacro(per100g);
    if (macro === "carbs" && per100g.carbsG > 0) return "carbs";
    if (macro === "protein" && per100g.proteinG > 0) return "protein";
    if (macro === "fat" && per100g.fatG > 0) return "fat";
  }

  return "calories";
}

/** @deprecated use canSwapWithinGroup */
export function canSwapWithinCategory(
  originalCategory: string | null,
  substituteCategory: string | null,
): boolean {
  return (
    Boolean(originalCategory && substituteCategory) &&
    originalCategory!.trim() === substituteCategory!.trim()
  );
}

export function buildPlanItemLabel(item: { name: string; display?: string | null }): string {
  return `${item.name} ${item.display || ""}`.trim();
}
