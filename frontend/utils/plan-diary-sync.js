import { createMealItemId } from '~/utils/meal-diary'

/** Calcula macros do item a partir dos valores por 100g (fallback quando o backend não casa por nome). */
function macrosFromPer100g(per100g, grams) {
  if (!per100g || !(grams > 0)) return { caloriesKcal: 0, carbsG: 0, proteinG: 0, fatG: 0 }
  const factor = grams / 100
  const num = (value) => {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  const round1 = (value) => Math.round(value * 10) / 10
  return {
    caloriesKcal: Math.round(num(per100g.caloriesKcal) * factor),
    carbsG: round1(num(per100g.carbsG) * factor),
    proteinG: round1(num(per100g.proteinG) * factor),
    fatG: round1(num(per100g.fatG) * factor),
  }
}

/** Gramas estimadas para bater com TBCA/TACO quando o PDF não traz peso. */
export function resolvePlanItemGrams(item) {
  if (!item) return 0
  if (item.unit === 'avontade') return 0

  const grams = Number(item.grams)
  if (Number.isFinite(grams) && grams > 0) return Math.round(grams)

  const ml = Number(item.ml)
  if (Number.isFinite(ml) && ml > 0) return Math.round(ml)

  const amount = Number(item.amount)
  if (Number.isFinite(amount) && amount > 0) {
    if (item.unit === 'g') return Math.round(amount)
    if (item.unit === 'ml') return Math.round(amount)
  }

  return 100
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

      const macros = macrosFromPer100g(item.per100g, grams)
      const foodId = item.foodId || null

      return {
        id: createMealItemId(),
        name,
        grams,
        ...macros,
        foodId,
        source: foodId ? 'food_bank' : 'meal_plan',
        originalName: item.key || item.display || name,
      }
    })
    .filter(Boolean)
}
