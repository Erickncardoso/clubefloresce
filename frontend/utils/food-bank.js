import { macrosForFoodAtGrams, round1 } from './food-macros.js'

export { normalizePer100gMacros, macrosAtGramsFromPer100g, macrosForFoodAtGrams } from './food-macros.js'

export function mapFoodItemFromApi(item) {
  if (!item) return null
  const rawPer100g = item.per100g || {
    caloriesKcal: item.caloriesKcal,
    proteinG: item.proteinG,
    carbsG: item.carbsG,
    fatG: item.fatG,
    fiberG: item.fiberG,
    sodiumMg: item.sodiumMg,
  }
  const per100g = rawPer100g
    ? {
        ...rawPer100g,
        caloriesKcal:
          rawPer100g.caloriesKcal == null
            ? rawPer100g.caloriesKcal
            : Math.round(Number(rawPer100g.caloriesKcal)),
        proteinG: rawPer100g.proteinG == null ? rawPer100g.proteinG : round1(rawPer100g.proteinG),
        carbsG: rawPer100g.carbsG == null ? rawPer100g.carbsG : round1(rawPer100g.carbsG),
        fatG: rawPer100g.fatG == null ? rawPer100g.fatG : round1(rawPer100g.fatG),
        fiberG: rawPer100g.fiberG == null ? rawPer100g.fiberG : round1(rawPer100g.fiberG),
      }
    : null
  return {
    id: item.id,
    source: item.source,
    sourceCode: item.sourceCode,
    name: item.name,
    displayName: item.displayName || item.name,
    category: item.category,
    per100g,
    nutrients: item.nutrients,
    nutrientsPer100g: extractNutrientsPer100gFromFood({ ...item, per100g }),
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
  if (key === 'TBCA') return 'TBCA 7.3'
  if (key === 'TACO') return 'TACO'
  if (key === 'TABNUT') return 'TABNUT'
  if (key === 'TUCUNDUVA') return 'Tucunduva'
  return String(source || '').trim() || '—'
}

/** Exibe kcal/100 g sem lixo de ponto flutuante (ex.: 352.67334000000001 → 353). */
export function formatPer100gKcal(value) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '—'
  return String(Math.round(Number(value)))
}
