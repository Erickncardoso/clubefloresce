import { formatMealItemLabel } from '~/utils/meal-plan-format'
import { createMealItemId } from '~/utils/meal-diary'
import { macrosForFoodRecord } from '~/utils/food-bank'
import { formatExtraItemLabel, resolveExtraItemGrams } from '~/utils/meal-extra-quantity'
import { getLocalDateKey } from '~/utils/local-date'

function todayKey() {
  return getLocalDateKey()
}

function storageKey(mealId) {
  return `dieta_extras_${todayKey()}_${mealId}`
}

function normalizeExtraItem(item) {
  if (!item?.id || !item?.name) return null

  const amount = Number(item.amount)
  const unit = item.unit || 'g'
  const grams = Math.max(1, Math.round(Number(item.grams) || resolveExtraItemGrams(amount, unit, item.name)))

  return {
    id: item.id,
    key: item.key || item.id,
    name: item.name,
    foodId: item.foodId || null,
    amount: Number.isFinite(amount) ? amount : grams,
    unit,
    grams,
    display: item.display || formatExtraItemLabel(item.name, amount, unit),
    caloriesKcal: item.caloriesKcal ?? 0,
    carbsG: item.carbsG ?? 0,
    proteinG: item.proteinG ?? 0,
    fatG: item.fatG ?? 0,
    source: item.source || 'food_bank',
    isExtra: true,
  }
}

export function useMealExtraItems() {
  const extrasCache = useState('meal-extra-items-cache', () => ({}))
  const extrasRevision = useState('meal-extra-items-revision', () => 0)

  function cacheKey(mealId) {
    return `${todayKey()}_${mealId}`
  }

  function readFromStorage(mealId) {
    if (import.meta.server) return []
    try {
      const raw = localStorage.getItem(storageKey(mealId))
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.map(normalizeExtraItem).filter(Boolean)
    } catch {
      return []
    }
  }

  function getExtraItems(mealId) {
    const key = cacheKey(mealId)
    if (!extrasCache.value[key]) {
      extrasCache.value[key] = readFromStorage(mealId)
    }
    return extrasCache.value[key]
  }

  function persistExtras(mealId, items) {
    const key = cacheKey(mealId)
    extrasCache.value[key] = items
    extrasRevision.value += 1
    if (import.meta.server) return
    localStorage.setItem(storageKey(mealId), JSON.stringify(items))
  }

  function addExtraItem(mealId, food, amount, unit = 'g') {
    if (!food?.name) return null

    const normalizedAmount = Number(amount)
    const safeAmount = Number.isFinite(normalizedAmount) && normalizedAmount > 0 ? normalizedAmount : 100
    const safeUnit = unit || 'g'
    const grams = resolveExtraItemGrams(safeAmount, safeUnit, food.name)
    if (grams <= 0) return null

    const item = {
      id: createMealItemId(),
      key: `extra-${createMealItemId()}`,
      name: food.name,
      foodId: food.id,
      amount: safeAmount,
      unit: safeUnit,
      grams,
      display: formatExtraItemLabel(food.name, safeAmount, safeUnit),
      source: 'food_bank',
      isExtra: true,
      ...macrosForFoodRecord(food, grams),
    }

    persistExtras(mealId, [...getExtraItems(mealId), item])
    return item
  }

  function removeExtraItem(mealId, itemId) {
    const next = getExtraItems(mealId).filter((item) => item.id !== itemId)
    persistExtras(mealId, next)
  }

  function applyExtraItemsToMeal(meal, mealId) {
    if (!meal) return null

    const extras = getExtraItems(mealId)
    if (!extras.length) return meal

    const items = [...(meal.items || []), ...extras]

    return {
      ...meal,
      items,
      itemLabels: items.map((item) => item.display || formatMealItemLabel(item)),
    }
  }

  return {
    extrasRevision,
    getExtraItems,
    addExtraItem,
    removeExtraItem,
    applyExtraItemsToMeal,
  }
}
