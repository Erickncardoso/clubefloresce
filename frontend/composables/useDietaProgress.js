import { getLocalDateKey } from '~/utils/local-date'

function todayKey() {
  return getLocalDateKey()
}

function storageKey(mealId) {
  return `dieta_checks_${todayKey()}_${mealId}`
}

export function useDietaProgress() {
  function loadChecked(mealId, itemCount) {
    if (import.meta.server) return Array(itemCount).fill(false)
    try {
      const raw = localStorage.getItem(storageKey(mealId))
      if (!raw) return Array(itemCount).fill(false)
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return Array(itemCount).fill(false)
      if (parsed.length === itemCount) return parsed.map(Boolean)
      const next = Array(itemCount).fill(false)
      for (let i = 0; i < Math.min(parsed.length, itemCount); i += 1) {
        next[i] = Boolean(parsed[i])
      }
      return next
    } catch {
      return Array(itemCount).fill(false)
    }
  }

  function saveChecked(mealId, states) {
    if (import.meta.server) return
    localStorage.setItem(storageKey(mealId), JSON.stringify(states))
  }

  function countDone(states) {
    return states.filter(Boolean).length
  }

  return { loadChecked, saveChecked, countDone }
}
