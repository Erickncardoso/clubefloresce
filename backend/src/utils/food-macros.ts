import type { FoodItemDto } from "../types/food.types";

export interface NormalizedPer100g {
  caloriesKcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Corrige erros de importação TACO/TBCA (ex.: 35,9 g → 359 g, 2,5 g → 25 g)
 * usando a energia (kcal) como referência fisiológica.
 */
function reconcileMacrosWithCalories(
  caloriesKcal: number,
  carbsG: number,
  proteinG: number,
  fatG: number,
): { carbsG: number; proteinG: number; fatG: number } {
  let c = Math.max(0, carbsG);
  let p = Math.max(0, proteinG);
  let f = Math.max(0, fatG);

  if (caloriesKcal <= 0) {
    return { carbsG: c, proteinG: p, fatG: f };
  }

  const energyGap = (c: number, p: number, f: number) =>
    Math.abs(caloriesKcal - (c * 4 + p * 4 + f * 9));

  if (c > 100) c /= 10;
  if (p > 55) p /= 10;

  // Proteína sozinha não pode exceder ~95% das kcal
  if (p > 20 && p * 4 > caloriesKcal * 0.95) {
    p /= 10;
  }

  // Gordura inflada em carnes magras (ex.: 25 g em vez de 2,5 g/100 g)
  if (p >= 8 && p <= 50 && f > 8 && caloriesKcal < 400) {
    const fFixed = f / 10;
    if (energyGap(c, p, fFixed) < energyGap(c, p, f)) {
      f = fFixed;
    }
  }

  if (f > 50 && caloriesKcal < 500) f /= 10;

  // Carboidrato inflado
  if (c * 4 > caloriesKcal * 0.95) c /= 10;

  // Ajuste final se ainda estiver muito distante da energia declarada
  if (energyGap(c, p, f) > caloriesKcal * 0.85) {
    if (p * 4 > caloriesKcal * 0.7) p /= 10;
    if (f * 9 > caloriesKcal * 0.55) f /= 10;
    if (c * 4 > caloriesKcal * 0.7) c /= 10;
  }

  return { carbsG: c, proteinG: p, fatG: f };
}

/** Preferir valores do JSON nutrients.per100g quando disponíveis. */
function readPer100gFromFood(food: FoodItemDto): NormalizedPer100g {
  const nutrients = food.nutrients?.per100g as Record<string, number | null> | undefined;
  const energyFromNutrients =
    nutrients?.energyKcal != null ? Number(nutrients.energyKcal) : null;

  let caloriesKcal = food.per100g.caloriesKcal || energyFromNutrients || 0;
  let carbsG = food.per100g.carbsG ?? nutrients?.carbsG ?? 0;
  let proteinG = food.per100g.proteinG ?? nutrients?.proteinG ?? 0;
  let fatG = food.per100g.fatG ?? nutrients?.fatG ?? 0;

  carbsG = carbsG || 0;
  proteinG = proteinG || 0;
  fatG = fatG || 0;

  const reconciled = reconcileMacrosWithCalories(caloriesKcal, carbsG, proteinG, fatG);

  return {
    caloriesKcal: Math.max(0, Math.round(caloriesKcal)),
    carbsG: Math.max(0, round1(reconciled.carbsG)),
    proteinG: Math.max(0, round1(reconciled.proteinG)),
    fatG: Math.max(0, round1(reconciled.fatG)),
  };
}

export function normalizePer100gMacros(food: FoodItemDto): NormalizedPer100g {
  return readPer100gFromFood(food);
}

export function macrosAtGramsFromPer100g(per100g: NormalizedPer100g, grams: number) {
  const portion = Math.max(1, Math.round(grams));
  const ratio = portion / 100;
  return {
    grams: portion,
    caloriesKcal: Math.max(0, Math.round(per100g.caloriesKcal * ratio)),
    carbsG: round1(per100g.carbsG * ratio),
    proteinG: round1(per100g.proteinG * ratio),
    fatG: round1(per100g.fatG * ratio),
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
