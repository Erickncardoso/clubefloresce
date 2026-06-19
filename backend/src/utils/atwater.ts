/**
 * Sistema de Atwater — regra universal para energia a partir de macronutrientes.
 *
 * Calorias = (g carboidratos × 4) + (g proteínas × 4) + (g gorduras × 9) [+ álcool × 7]
 *
 * TACO/TBCA: carboidratos declarados já costumam excluir fibras da conta energética.
 */

export const ATWATER_CARBS_KCAL_PER_G = 4;
export const ATWATER_PROTEIN_KCAL_PER_G = 4;
export const ATWATER_FAT_KCAL_PER_G = 9;
export const ATWATER_ALCOHOL_KCAL_PER_G = 7;

export interface AtwaterInput {
  carbsG?: number | null;
  proteinG?: number | null;
  fatG?: number | null;
  alcoholG?: number | null;
}

export function digestibleCarbsForAtwater(totalCarbsG: number, fiberG = 0): number {
  const carbs = Math.max(0, Number(totalCarbsG) || 0);
  const fiber = Math.max(0, Number(fiberG) || 0);

  // TACO/TBCA: fibra listada à parte — não entra na energia digestível (≈0–2 kcal/g).
  if (fiber > 0 && fiber < carbs) {
    return carbs - fiber;
  }

  return carbs;
}

export function atwaterInputFromMacros(macros: {
  carbsG?: number | null;
  proteinG?: number | null;
  fatG?: number | null;
  alcoholG?: number | null;
  fiberG?: number | null;
}): AtwaterInput {
  return {
    carbsG: digestibleCarbsForAtwater(
      Number(macros.carbsG) || 0,
      Number(macros.fiberG) || 0,
    ),
    proteinG: macros.proteinG,
    fatG: macros.fatG,
    alcoholG: macros.alcoholG,
  };
}

export function hasUsableMacrosForAtwater(input: AtwaterInput): boolean {
  return (
    Math.max(0, Number(input.carbsG) || 0) > 0
    || Math.max(0, Number(input.proteinG) || 0) > 0
    || Math.max(0, Number(input.fatG) || 0) > 0
  );
}

/** Calcula kcal totais pelos fatores de Atwater (sem arredondar internamente). */
export function calculateAtwaterCaloriesRaw(input: AtwaterInput): number {
  const carbsG = Math.max(0, Number(input.carbsG) || 0);
  const proteinG = Math.max(0, Number(input.proteinG) || 0);
  const fatG = Math.max(0, Number(input.fatG) || 0);
  const alcoholG = Math.max(0, Number(input.alcoholG) || 0);

  return (
    carbsG * ATWATER_CARBS_KCAL_PER_G
    + proteinG * ATWATER_PROTEIN_KCAL_PER_G
    + fatG * ATWATER_FAT_KCAL_PER_G
    + alcoholG * ATWATER_ALCOHOL_KCAL_PER_G
  );
}

/** kcal arredondadas para exibição e persistência. */
export function calculateAtwaterCalories(input: AtwaterInput): number {
  return Math.max(0, Math.round(calculateAtwaterCaloriesRaw(input)));
}

export function atwaterEnergyGap(declaredKcal: number, input: AtwaterInput): number {
  if (declaredKcal <= 0) return 0;
  return Math.abs(declaredKcal - calculateAtwaterCaloriesRaw(input));
}

export function macroEnergyContributions(input: AtwaterInput) {
  const carbsG = Math.max(0, Number(input.carbsG) || 0);
  const proteinG = Math.max(0, Number(input.proteinG) || 0);
  const fatG = Math.max(0, Number(input.fatG) || 0);
  const alcoholG = Math.max(0, Number(input.alcoholG) || 0);

  return {
    carbsKcal: carbsG * ATWATER_CARBS_KCAL_PER_G,
    proteinKcal: proteinG * ATWATER_PROTEIN_KCAL_PER_G,
    fatKcal: fatG * ATWATER_FAT_KCAL_PER_G,
    alcoholKcal: alcoholG * ATWATER_ALCOHOL_KCAL_PER_G,
  };
}
