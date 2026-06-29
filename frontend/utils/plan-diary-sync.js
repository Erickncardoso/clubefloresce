import { createMealItemId } from '~/utils/meal-diary'

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
      const grams = resolvePlanItemGrams(item)
      const name = String(item.name || item.food || '').trim()
      if (!name || grams <= 0) return null

      return {
        id: createMealItemId(),
        name,
        grams,
        caloriesKcal: 0,
        carbsG: 0,
        proteinG: 0,
        fatG: 0,
        foodId: null,
        source: 'meal_plan',
        originalName: item.key || item.display || name,
      }
    })
    .filter(Boolean)
}
