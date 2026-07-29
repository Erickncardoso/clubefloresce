import { formatMealItemLabel, normalizeFoodEditorItem } from '~/utils/meal-plan-format'
import { normalizeMealPlanItem } from '~/utils/meal-plan-display-parse'
import { getLocalDateKey } from '~/utils/local-date'

function todayKey() {
  return getLocalDateKey()
}

function storageKey(mealId) {
  return `dieta_overrides_${todayKey()}_${mealId}`
}

function normalizeOverrideItem(item) {
  if (!item) return null
  const draft = normalizeMealPlanItem({
    key: item.key || `sub-${slugify(item.name || item.display || 'item')}`,
    name: item.name || item.food || '',
    amount: item.amount ?? null,
    unit: item.unit || 'porcao',
    grams: item.grams ?? null,
    ml: item.ml ?? null,
    display: item.display || item.label || '',
    foodId: item.foodId ?? null,
    per100g: item.per100g ?? null,
  })
  draft.display = draft.display || formatMealItemLabel(draft)
  normalizeFoodEditorItem(draft)
  return draft
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

function normalizeOverrideDisplay(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function resolveOverrideDisplay(item) {
  if (!item) return ''
  return item.display || item.label || formatMealItemLabel(item) || ''
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
    const existing = current[itemKey] || null

    if (!normalized) {
      if (!existing) return
      delete current[itemKey]
    } else if (existing && isSameOverride(existing, normalized)) {
      return
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
    if (!a && !b) return true
    if (!a || !b) return false

    const aDisplay = normalizeOverrideDisplay(resolveOverrideDisplay(a))
    const bDisplay = normalizeOverrideDisplay(resolveOverrideDisplay(b))
    if (!aDisplay || !bDisplay) return false
    return aDisplay === bDisplay
  }

  function clearAllOverrides() {
    overridesCache.value = {}
    overridesRevision.value += 1
    if (import.meta.server || typeof localStorage === 'undefined') return

    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (key?.startsWith('dieta_overrides_')) localStorage.removeItem(key)
    }
  }

  function pruneOverridesForPlan(planRecord) {
    const meals = planRecord?.plan?.meals
    if (!meals?.length) return

    for (const meal of meals) {
      const validKeys = new Set((meal.items || []).map((item) => item.key))
      const current = { ...getOverrides(meal.id) }
      let changed = false

      for (const [key, override] of Object.entries(current)) {
        if (!validKeys.has(key)) {
          delete current[key]
          changed = true
          continue
        }

        const prescribed = (meal.items || []).find((item) => item.key === key)
        if (prescribed && isSameOverride(prescribed, override)) {
          delete current[key]
          changed = true
        }
      }

      if (changed) persistOverrides(meal.id, current)
    }
  }

  function applyOverridesToMeal(meal, mealId) {
    if (!meal) return null

    const overrides = getOverrides(mealId)
    const items = (meal.items || []).map((item) => {
      const normalizedItem = normalizeMealPlanItem(item)
      const override = overrides[item.key]

      if (!override) {
        return {
          ...normalizedItem,
          isSubstituted: false,
        }
      }

      const normalizedOverride = normalizeOverrideItem(override)
      if (isSameOverride(normalizedItem, normalizedOverride)) {
        return {
          ...normalizedItem,
          isSubstituted: false,
        }
      }

      const merged = normalizeMealPlanItem({
        ...item,
        ...normalizedOverride,
        display: normalizedOverride.display || item.display || formatMealItemLabel(normalizedOverride),
        originalDisplay: item.display || formatMealItemLabel(item),
      })
      return {
        ...merged,
        isSubstituted: true,
        activeSubstitute: normalizedOverride,
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
    clearAllOverrides,
    pruneOverridesForPlan,
    getOverrideForItem,
    isSameOverride,
    applyOverridesToMeal,
  }
}
