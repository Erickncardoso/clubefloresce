import { useAuthSession } from '~/composables/useAuthSession.js'

const STORAGE_PREFIX = 'cf-food-favorites'
const MAX_FAVORITES = 200

function storageKey(userId) {
  return `${STORAGE_PREFIX}:${userId || 'anonymous'}`
}

function readIds(userId) {
  if (typeof window === 'undefined' || !userId) return []
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
  } catch {
    return []
  }
}

function writeIds(userId, ids) {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(ids.slice(0, MAX_FAVORITES)))
  } catch {
    /* quota exceeded */
  }
}

export function useFoodFavorites() {
  const { verifiedUser } = useAuthSession()
  const favoriteIds = useState('food-favorite-ids', () => [])

  watch(
    () => verifiedUser.value?.id,
    (userId) => {
      favoriteIds.value = readIds(userId)
    },
    { immediate: true },
  )

  function isFavorite(foodId) {
    return favoriteIds.value.includes(String(foodId))
  }

  function toggleFavorite(foodId) {
    const id = String(foodId || '')
    const userId = verifiedUser.value?.id
    if (!id || !userId) return false

    const current = [...favoriteIds.value]
    const index = current.indexOf(id)
    if (index >= 0) {
      current.splice(index, 1)
    } else {
      current.unshift(id)
    }

    favoriteIds.value = current
    writeIds(userId, current)
    return index < 0
  }

  function sortWithFavorites(items) {
    if (!items?.length || !favoriteIds.value.length) return items || []

    const rank = new Map(favoriteIds.value.map((id, index) => [String(id), index]))
    return [...items].sort((a, b) => {
      const aRank = rank.has(String(a.id)) ? rank.get(String(a.id)) : Number.MAX_SAFE_INTEGER
      const bRank = rank.has(String(b.id)) ? rank.get(String(b.id)) : Number.MAX_SAFE_INTEGER
      if (aRank !== bRank) return aRank - bRank
      return 0
    })
  }

  return {
    favoriteIds,
    isFavorite,
    toggleFavorite,
    sortWithFavorites,
  }
}
