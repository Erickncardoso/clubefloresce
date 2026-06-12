import { mapFoodItemFromApi, macrosForFoodRecord } from '~/utils/food-bank'

const matchCache = new Map()
const searchCache = new Map()

export function useFoodBank() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  function authHeaders() {
    if (!import.meta.client) return {}
    const token = localStorage.getItem('auth_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function matchFoodByName(name) {
    const normalized = String(name || '').trim().toLowerCase()
    if (!normalized) return null
    if (matchCache.has(normalized)) return matchCache.get(normalized)

    try {
      const res = await $fetch(`${apiBase}/foods/match`, {
        headers: authHeaders(),
        query: { name },
      })
      const item = mapFoodItemFromApi(res.item)
      matchCache.set(normalized, item)
      return item
    } catch {
      matchCache.set(normalized, null)
      return null
    }
  }

  async function searchFoods(query, limit = 20) {
    const key = `${String(query || '').trim().toLowerCase()}::${limit}`
    if (searchCache.has(key)) return searchCache.get(key)

    try {
      const res = await $fetch(`${apiBase}/foods/search`, {
        headers: authHeaders(),
        query: { q: query || '', limit },
      })
      const items = (res.items || []).map(mapFoodItemFromApi).filter(Boolean)
      searchCache.set(key, items)
      return items
    } catch {
      searchCache.set(key, [])
      return []
    }
  }

  async function getFoodById(id) {
    if (!id) return null
    try {
      const res = await $fetch(`${apiBase}/foods/${id}`, {
        headers: authHeaders(),
      })
      return mapFoodItemFromApi(res.item)
    } catch {
      return null
    }
  }

  return {
    matchFoodByName,
    searchFoods,
    getFoodById,
    macrosForFoodRecord,
  }
}
