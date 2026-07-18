import { formatMealItemLabel } from '~/utils/meal-plan-format'
import { getLocalDateKey } from '~/utils/local-date'

function todayKey() {
  return getLocalDateKey()
}

function storageKey(mealId) {
  return `dieta_overrides_${todayKey()}_${mealId}`
}

function normalizeOverrideItem(item) {
  if (!item) return null
  return {
    key: item.key || `sub-${slugify(item.name || item.display || 'item')}`,
    name: item.name || item.food || '',
    amount: item.amount ?? null,
    unit: item.unit || 'porcao',
    grams: item.grams ?? null,
    ml: item.ml ?? null,
    display: item.display || item.label || formatMealItemLabel(item),
    foodId: item.foodId ?? null,
    per100g: item.per100g ?? null,
  }
}

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export function useMealItemOverrides() {
  const overridesCache = useState('meal-item-overrides-cache', () => ({}))
  const overridesRevision = useState('meal-item-overrides-revision', () => 0)

  function cacheKey(mealId) {
    return `${todayKey()}_${mealId}`
  }

  function readFromStorage(mealId) {
    if (import.meta.server) return {}
    try {
      const raw = localStorage.getItem(storageKey(mealId))
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  function getOverrides(mealId) {
    const key = cacheKey(mealId)
    if (!overridesCache.value[key]) {
      overridesCache.value[key] = readFromStorage(mealId)
    }
    return overridesCache.value[key]
  }

  function persistOverrides(mealId, overrides) {
    const key = cacheKey(mealId)
    overridesCache.value[key] = overrides
    overridesRevision.value += 1
    if (import.meta.server) return
    localStorage.setItem(storageKey(mealId), JSON.stringify(overrides))
  }

  function setOverride(mealId, itemKey, substituteItem) {
    const current = { ...getOverrides(mealId) }
    const normalized = normalizeOverrideItem(substituteItem)

    if (!normalized) {
      delete current[itemKey]
    } else {
      current[itemKey] = normalized
    }

    persistOverrides(mealId, current)
  }

  function clearOverride(mealId, itemKey) {
    setOverride(mealId, itemKey, null)
  }

  function getOverrideForItem(mealId, itemKey) {
    return getOverrides(mealId)[itemKey] || null
  }

  function isSameOverride(a, b) {
    if (!a || !b) return false
    const aDisplay = a.display || a.label || ''
    const bDisplay = b.display || b.label || ''
    return aDisplay === bDisplay
  }

  function applyOverridesToMeal(meal, mealId) {
    if (!meal) return null

    const overrides = getOverrides(mealId)
    const items = (meal.items || []).map((item) => {
      const override = overrides[item.key]
      if (!override) return { ...item, isSubstituted: false }

      const display = override.display || formatMealItemLabel(override)
      return {
        ...item,
        name: override.name || item.name,
        display,
        grams: override.grams ?? item.grams,
        ml: override.ml ?? item.ml,
        amount: override.amount ?? item.amount,
        unit: override.unit ?? item.unit,
        foodId: override.foodId ?? null,
        per100g: override.per100g ?? null,
        isSubstituted: true,
        originalDisplay: item.display || formatMealItemLabel(item),
        activeSubstitute: override,
      }
    })

    return {
      ...meal,
      items,
      itemLabels: items.map((item) => item.display || formatMealItemLabel(item)),
    }
  }

  return {
    overridesRevision,
    getOverrides,
    setOverride,
    clearOverride,
    getOverrideForItem,
    isSameOverride,
    applyOverridesToMeal,
  }
}
