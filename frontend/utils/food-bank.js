import { macrosForFoodAtGrams, round1 } from './food-macros.js'

export { normalizePer100gMacros, macrosAtGramsFromPer100g, macrosForFoodAtGrams } from './food-macros.js'

export function mapFoodItemFromApi(item) {
  if (!item) return null
  return {
    id: item.id,
    source: item.source,
    sourceCode: item.sourceCode,
    name: item.name,
    displayName: item.displayName || item.name,
    category: item.category,
    per100g: item.per100g || {
      caloriesKcal: item.caloriesKcal,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      fiberG: item.fiberG,
      sodiumMg: item.sodiumMg,
    },
    nutrients: item.nutrients,
    nutrientsPer100g: extractNutrientsPer100gFromFood(item),
  }
}

export function extractNutrientsPer100gFromFood(food) {
  if (!food) return null
  const fromNutrients = food.nutrients?.per100g
  if (fromNutrients && typeof fromNutrients === 'object') {
    return { ...fromNutrients }
  }
  const per100g = food.per100g
  if (!per100g) return null
  return {
    energyKcal: per100g.caloriesKcal ?? null,
    proteinG: per100g.proteinG ?? null,
    carbsAvailableG: per100g.carbsG ?? null,
    fatG: per100g.fatG ?? null,
    fiberG: per100g.fiberG ?? null,
    sodiumMg: per100g.sodiumMg ?? null,
  }
}

export function macrosForFoodRecord(food, grams) {
  if (!food?.per100g && !food?.nutrients) return null
  const macros = macrosForFoodAtGrams(food, grams)
  return {
    caloriesKcal: macros.caloriesKcal,
    carbsG: round1(macros.carbsG),
    proteinG: round1(macros.proteinG),
    fatG: round1(macros.fatG),
  }
}

export function formatFoodSourceLabel(source) {
  const key = String(source || '').trim().toUpperCase()
  if (key === 'CUSTOM') return 'florescer'
  return String(source || '').trim() || '—'
}
