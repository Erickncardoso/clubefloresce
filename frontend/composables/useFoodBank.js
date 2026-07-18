import { authFetchInit } from '~/composables/useAuthSession.js'
import { mapFoodItemFromApi, macrosForFoodRecord } from '~/utils/food-bank'

const matchCache = new Map()
const searchCache = new Map()

export function useFoodBank() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase
  const foodCatalog = useFoodCatalog()

  async function matchFoodByName(name, source) {
    const normalized = String(name || '').trim().toLowerCase()
    if (!normalized) return null
    const cacheKey = source ? `${normalized}::${source}` : normalized
    if (matchCache.has(cacheKey)) return matchCache.get(cacheKey)

    const local = await foodCatalog.matchFoodLocal(name, source)
    if (local) {
      matchCache.set(cacheKey, local)
      return local
    }

    try {
      const query = { name }
      if (source) query.source = source
      const res = await $fetch(`${apiBase}/foods/match`, authFetchInit({ query }))
      const item = mapFoodItemFromApi(res.item)
      matchCache.set(cacheKey, item)
      return item
    } catch {
      matchCache.set(cacheKey, null)
      return null
    }
  }

  async function matchFoodForMealPlan(name) {
    const normalized = String(name || '').trim()
    if (!normalized) return null

    const cacheKey = `${normalized}::meal-plan-all`
    if (matchCache.has(cacheKey)) return matchCache.get(cacheKey)

    const local = await foodCatalog.matchFoodLocalForMealPlan(name)
    if (local?.per100g?.caloriesKcal != null) {
      matchCache.set(cacheKey, local)
      return local
    }

    const batch = await matchFoodBatchForMealPlan([{ key: 'single', name }])
    const item = batch.get('single') || null
    matchCache.set(cacheKey, item)
    return item
  }

  async function matchFoodBatchForMealPlan(items) {
    const entries = (items || [])
      .map((entry) => ({
        key: String(entry?.key || '').trim(),
        name: String(entry?.name || '').trim(),
      }))
      .filter((entry) => entry.key && entry.name)

    if (!entries.length) return new Map()

    const localMap = await foodCatalog.matchFoodBatchLocal(entries)
    if (localMap) {
      for (const [key, item] of localMap.entries()) {
        if (item?.name) {
          const normalized = String(item.name).trim().toLowerCase()
          matchCache.set(normalized, item)
        }
      }
      return localMap
    }

    try {
      const res = await $fetch(`${apiBase}/foods/match-batch`, authFetchInit({
        method: 'POST',
        body: { items: entries },
      }))

      const map = new Map()
      for (const row of res.matches || []) {
        const item = row?.item ? mapFoodItemFromApi(row.item) : null
        map.set(row.key, item)
        if (row?.item?.name) {
          const normalized = String(row.item.name).trim().toLowerCase()
          matchCache.set(normalized, item)
        }
      }
      return map
    } catch {
      return new Map()
    }
  }

  async function searchFoods(query, limit = 20) {
    const key = `${String(query || '').trim().toLowerCase()}::${limit}`
    if (searchCache.has(key)) return searchCache.get(key)

    const localItems = await foodCatalog.searchFoodsLocal(query, { limit })
    if (localItems) {
      searchCache.set(key, localItems)
      return localItems
    }

    try {
      const res = await $fetch(`${apiBase}/foods/search`, authFetchInit({ query: { q: query || '', limit } }))
      const items = (res.items || []).map(mapFoodItemFromApi).filter(Boolean)
      searchCache.set(key, items)
      return items
    } catch {
      const fallback = localItems || []
      searchCache.set(key, fallback)
      return fallback
    }
  }

  async function getFoodById(id) {
    if (!id) return null

    const local = await foodCatalog.getFoodByIdLocal(id)
    if (local) return local

    try {
      const res = await $fetch(`${apiBase}/foods/${id}`, authFetchInit())
      return mapFoodItemFromApi(res.item)
    } catch {
      return null
    }
  }

  return {
    matchFoodByName,
    matchFoodForMealPlan,
    matchFoodBatchForMealPlan,
    searchFoods,
    getFoodById,
    macrosForFoodRecord,
    foodCatalog,
  }
}
