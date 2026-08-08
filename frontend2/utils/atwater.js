/** Fatores de Atwater — espelha backend/src/utils/atwater.ts */

export const ATWATER_CARBS_KCAL_PER_G = 4
export const ATWATER_PROTEIN_KCAL_PER_G = 4
export const ATWATER_FAT_KCAL_PER_G = 9
export const ATWATER_ALCOHOL_KCAL_PER_G = 7

export function digestibleCarbsForAtwater(totalCarbsG, fiberG = 0) {
  const carbs = Math.max(0, Number(totalCarbsG) || 0)
  const fiber = Math.max(0, Number(fiberG) || 0)
  if (fiber > 0 && fiber < carbs) return carbs - fiber
  return carbs
}

export function atwaterInputFromMacros(macros) {
  return {
    carbsG: digestibleCarbsForAtwater(Number(macros.carbsG) || 0, Number(macros.fiberG) || 0),
    proteinG: macros.proteinG,
    fatG: macros.fatG,
    alcoholG: macros.alcoholG,
  }
}

export function hasUsableMacrosForAtwater(input) {
  return (
    Math.max(0, Number(input.carbsG) || 0) > 0
    || Math.max(0, Number(input.proteinG) || 0) > 0
    || Math.max(0, Number(input.fatG) || 0) > 0
  )
}

export function calculateAtwaterCaloriesRaw(input) {
  const carbsG = Math.max(0, Number(input.carbsG) || 0)
  const proteinG = Math.max(0, Number(input.proteinG) || 0)
  const fatG = Math.max(0, Number(input.fatG) || 0)
  const alcoholG = Math.max(0, Number(input.alcoholG) || 0)
  return (
    carbsG * ATWATER_CARBS_KCAL_PER_G
    + proteinG * ATWATER_PROTEIN_KCAL_PER_G
    + fatG * ATWATER_FAT_KCAL_PER_G
    + alcoholG * ATWATER_ALCOHOL_KCAL_PER_G
  )
}

export function calculateAtwaterCalories(input) {
  return Math.max(0, Math.round(calculateAtwaterCaloriesRaw(input)))
}

export function atwaterEnergyGap(declaredKcal, input) {
  if (declaredKcal <= 0) return 0
  return Math.abs(declaredKcal - calculateAtwaterCaloriesRaw(input))
}
