import type { FoodItemDto } from "../types/food.types";
import {
  atwaterEnergyGap,
  atwaterInputFromMacros,
  calculateAtwaterCalories,
  digestibleCarbsForAtwater,
  hasUsableMacrosForAtwater,
} from "./atwater";

/** TACO/TBCA: energia da tabela. Demais casos: Atwater a partir dos macros. */
export type FoodEnergyPolicy = "table" | "atwater";

export interface NormalizedPer100g {
  caloriesKcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  fiberG?: number;
  energyPolicy: FoodEnergyPolicy;
  /** TBCA: carboidrato disponível já exclui fibra — não descontar de novo. */
  carbsDigestible?: boolean;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function readFiberG(food: FoodItemDto): number {
  const fromColumn = food.per100g.fiberG;
  if (fromColumn != null && fromColumn >= 0) return fromColumn;
  const fromNutrients = food.nutrients?.per100g?.fiberG;
  if (fromNutrients != null && fromNutrients >= 0) return fromNutrients;
  return 0;
}

function readAlcoholG(food: FoodItemDto): number {
  const fromNutrients = food.nutrients?.per100g?.alcoholG;
  if (fromNutrients != null && fromNutrients >= 0) return fromNutrients;
  return 0;
}

function readCarbsG(food: FoodItemDto): number {
  const nutrients = food.nutrients?.per100g;

  if (food.source === "TBCA") {
    const available = nutrients?.carbsAvailableG;
    if (available != null && available >= 0) return available;
    const total = nutrients?.carbsTotalG;
    if (total != null && total >= 0) return total;
  }

  const fromColumn = food.per100g.carbsG;
  if (fromColumn != null && fromColumn >= 0) return fromColumn;

  const fromNutrients = nutrients?.carbsG;
  if (fromNutrients != null && fromNutrients >= 0) return fromNutrients;

  return 0;
}

function usesTableEnergy(food: FoodItemDto, declaredKcal: number): boolean {
  return (food.source === "TACO" || food.source === "TBCA") && declaredKcal > 0;
}

/**
 * Corrige erros de importação (ex.: 35,9 g → 359 g). Não altera macros válidos da TACO.
 */
function reconcileMacrosWithCalories(
  caloriesKcal: number,
  carbsG: number,
  proteinG: number,
  fatG: number,
  fiberG: number,
  carbsDigestible: boolean,
): { carbsG: number; proteinG: number; fatG: number } {
  let c = Math.max(0, carbsG);
  let p = Math.max(0, proteinG);
  let f = Math.max(0, fatG);

  if (caloriesKcal <= 0) {
    return { carbsG: c, proteinG: p, fatG: f };
  }

  const energyGap = (carbs: number, protein: number, fat: number) =>
    atwaterEnergyGap(
      caloriesKcal,
      atwaterInputFromMacros({
        carbsG: carbsDigestible ? carbs : digestibleCarbsForAtwater(carbs, fiberG),
        proteinG: protein,
        fatG: fat,
        fiberG: carbsDigestible ? 0 : fiberG,
      }),
    );

  if (c > 100) c /= 10;
  if (p > 55) p /= 10;

  if (p > 20 && p * 4 > caloriesKcal * 0.95) {
    p /= 10;
  }

  if (p >= 8 && p <= 50 && f > 8 && caloriesKcal < 400) {
    const fFixed = f / 10;
    if (energyGap(c, p, fFixed) < energyGap(c, p, f)) {
      f = fFixed;
    }
  }

  if (f > 50 && caloriesKcal < 500) f /= 10;

  if (energyGap(c, p, f) > caloriesKcal * 0.85) {
    if (p * 4 > caloriesKcal * 0.7) p /= 10;
    if (f * 9 > caloriesKcal * 0.55) f /= 10;
    if (c > 45 && c * 4 > caloriesKcal * 0.95) c /= 10;
  }

  return { carbsG: c, proteinG: p, fatG: f };
}

function resolveCaloriesKcal(
  declaredKcal: number,
  energyPolicy: FoodEnergyPolicy,
  atwaterInput: ReturnType<typeof atwaterInputFromMacros>,
): number {
  if (energyPolicy === "table") {
    return Math.max(0, Math.round(declaredKcal));
  }

  if (hasUsableMacrosForAtwater(atwaterInput)) {
    return calculateAtwaterCalories(atwaterInput);
  }

  return Math.max(0, Math.round(declaredKcal));
}

/** Preferir valores do JSON nutrients.per100g quando disponíveis. */
function readPer100gFromFood(food: FoodItemDto): NormalizedPer100g {
  const nutrients = food.nutrients?.per100g;
  const energyFromNutrients =
    nutrients?.energyKcal != null ? Number(nutrients.energyKcal) : null;

  const declaredKcal = food.per100g.caloriesKcal || energyFromNutrients || 0;
  let carbsG = readCarbsG(food);
  let proteinG = food.per100g.proteinG ?? nutrients?.proteinG ?? 0;
  let fatG = food.per100g.fatG ?? nutrients?.fatG ?? 0;
  const fiberG = readFiberG(food);
  const carbsDigestible =
    food.source === "TBCA"
    && nutrients?.carbsAvailableG != null
    && nutrients.carbsAvailableG >= 0;

  proteinG = proteinG || 0;
  fatG = fatG || 0;

  const reconciled = reconcileMacrosWithCalories(
    declaredKcal,
    carbsG,
    proteinG,
    fatG,
    fiberG,
    carbsDigestible,
  );
  const alcoholG = readAlcoholG(food);

  const atwaterInput = atwaterInputFromMacros({
    carbsG: reconciled.carbsG,
    proteinG: reconciled.proteinG,
    fatG: reconciled.fatG,
    fiberG: carbsDigestible ? 0 : fiberG,
    alcoholG,
  });

  const energyPolicy: FoodEnergyPolicy = usesTableEnergy(food, declaredKcal)
    ? "table"
    : "atwater";

  const caloriesKcal = resolveCaloriesKcal(declaredKcal, energyPolicy, atwaterInput);

  return {
    caloriesKcal,
    carbsG: Math.max(0, round1(reconciled.carbsG)),
    proteinG: Math.max(0, round1(reconciled.proteinG)),
    fatG: Math.max(0, round1(reconciled.fatG)),
    fiberG: Math.max(0, round1(fiberG)),
    energyPolicy,
    carbsDigestible,
  };
}

export function normalizePer100gMacros(food: FoodItemDto): NormalizedPer100g {
  return readPer100gFromFood(food);
}

export function macrosAtGramsFromPer100g(per100g: NormalizedPer100g, grams: number, alcoholGPer100g = 0) {
  const portion = Math.max(1, Math.round(grams));
  const ratio = portion / 100;
  const carbsG = round1(per100g.carbsG * ratio);
  const proteinG = round1(per100g.proteinG * ratio);
  const fatG = round1(per100g.fatG * ratio);
  const alcoholG = round1(alcoholGPer100g * ratio);

  let caloriesKcal: number;
  if (per100g.energyPolicy === "table" && per100g.caloriesKcal > 0) {
    caloriesKcal = Math.max(0, Math.round(per100g.caloriesKcal * ratio));
  } else {
    const digestibleCarbsG = per100g.carbsDigestible
      ? carbsG
      : round1(
          digestibleCarbsForAtwater(per100g.carbsG, per100g.fiberG ?? 0) * ratio,
        );
    caloriesKcal = calculateAtwaterCalories({
      carbsG: digestibleCarbsG,
      proteinG,
      fatG,
      alcoholG,
    });
  }

  return {
    grams: portion,
    caloriesKcal,
    carbsG,
    proteinG,
    fatG,
  };
}

function formatDecimal(value: number): string {
  const rounded = round1(value);
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

/** Formato legível para a paciente (sem siglas C/P/G). */
export function formatMacrosForPatient(macros: {
  grams: number;
  caloriesKcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
}): string {
  return (
    `Porção: **${formatDecimal(macros.grams)} g**\n` +
    `- Calorias: ${macros.caloriesKcal} kcal\n` +
    `- Carboidratos: ${formatDecimal(macros.carbsG)} g\n` +
    `- Proteínas: ${formatDecimal(macros.proteinG)} g\n` +
    `- Gorduras: ${formatDecimal(macros.fatG)} g`
  );
}

export function formatMacrosShort(macros: {
  grams: number;
  caloriesKcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
}): string {
  return formatMacrosForPatient(macros);
}

export {
  calculateAtwaterCalories,
  calculateAtwaterCaloriesRaw,
  digestibleCarbsForAtwater,
  hasUsableMacrosForAtwater,
  macroEnergyContributions,
} from "./atwater";
