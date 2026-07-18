import { createMealItemId } from './meal-diary.js'
import { amountToGrams, parseMeasureFromUnit } from './meal-portion-measures.js'

/** Extrai gramas/ml explícitos de textos como "Mussarela (50g)", "30g whey", "200 ml leite". */
export function parseMeasureFromDisplay(text) {
  const raw = String(text || '').trim()
  if (!raw) return null

  const parensG = raw.match(/\(\s*(\d+(?:[.,]\d+)?)\s*g\s*\)/i)
  if (parensG) {
    return { grams: Math.round(Number(parensG[1].replace(',', '.'))) }
  }

  const parensMl = raw.match(/\(\s*(\d+(?:[.,]\d+)?)\s*ml\s*\)/i)
  if (parensMl) {
    return { ml: Math.round(Number(parensMl[1].replace(',', '.'))) }
  }

  const trailingG = raw.match(/(\d+(?:[.,]\d+)?)\s*g\s*$/i)
  if (trailingG) {
    return { grams: Math.round(Number(trailingG[1].replace(',', '.'))) }
  }

  const leadingG = raw.match(/^(\d+(?:[.,]\d+)?)\s*g\b/i)
  if (leadingG) {
    return { grams: Math.round(Number(leadingG[1].replace(',', '.'))) }
  }

  const trailingMl = raw.match(/(\d+(?:[.,]\d+)?)\s*ml\s*$/i)
  if (trailingMl) {
    return { ml: Math.round(Number(trailingMl[1].replace(',', '.'))) }
  }

  return null
}

/** Gramas reais do item do plano — nunca assume 100g por padrão. */
export function resolvePlanItemGrams(item) {
  if (!item) return 0
  if (item.unit === 'avontade') return 0

  const explicitGrams = Number(item.grams)
  if (Number.isFinite(explicitGrams) && explicitGrams > 0) {
    return Math.round(explicitGrams)
  }

  const explicitMl = Number(item.ml)
  if (Number.isFinite(explicitMl) && explicitMl > 0) {
    return Math.round(explicitMl)
  }

  const fromText =
    parseMeasureFromDisplay(item.display)
    || parseMeasureFromDisplay(item.name)
    || parseMeasureFromDisplay(item.originalDisplay)
  if (fromText?.grams > 0) return fromText.grams
  if (fromText?.ml > 0) return fromText.ml

  const amount = Number(item.amount)
  if (Number.isFinite(amount) && amount > 0) {
    const unit = String(item.unit || '').trim().toLowerCase()
    if (unit === 'g') return Math.round(amount)
    if (unit === 'ml') return Math.round(amount)

    const measureId = parseMeasureFromUnit(item.unit)
    if (measureId === 'grams') return Math.round(amount)
    if (measureId === 'ml') return Math.round(amount)
    if (measureId) {
      return amountToGrams(amount, measureId, item.name || item.display)
    }
  }

  return 0
}

export function buildPlanDiaryItems(meal, checkedStates = []) {
  if (!meal?.items?.length) return []

  return meal.items
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => Boolean(checkedStates[index]))
    .map(({ item }) => {
      const name = String(item.name || item.food || '').trim()
      if (!name) return null

      if (item.isExtra && item.foodId) {
        const grams = Math.max(1, Math.round(Number(item.grams) || 0))
        if (grams <= 0) return null

        return {
          id: item.id || createMealItemId(),
          name,
          grams,
          caloriesKcal: item.caloriesKcal || 0,
          carbsG: item.carbsG || 0,
          proteinG: item.proteinG || 0,
          fatG: item.fatG || 0,
          foodId: item.foodId,
          source: 'food_bank',
          originalName: name,
        }
      }

      const grams = resolvePlanItemGrams(item)
      if (grams <= 0) return null

      const foodId = item.foodId || null

      return {
        id: createMealItemId(),
        name,
        grams,
        caloriesKcal: 0,
        carbsG: 0,
        proteinG: 0,
        fatG: 0,
        foodId,
        source: foodId ? 'food_bank' : 'meal_plan',
        originalName: item.key || item.display || name,
      }
    })
    .filter(Boolean)
}
