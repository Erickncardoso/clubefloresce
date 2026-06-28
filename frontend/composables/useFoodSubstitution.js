/** Calculadora de substituição (metodologia 4nutris: TBCA + similaridade de cossenos). */

import { authFetchInit } from '~/composables/useAuthSession.js'

export function useFoodSubstitution() {
  const config = useRuntimeConfig()

  async function searchFoods(query, limit = 12) {
    const q = String(query || '').trim()
    if (!q) return []

    const result = await $fetch(`${config.public.apiBase}/foods/search`, authFetchInit({
      query: { q, limit },
    }))

    return result?.items || []
  }

  async function calculateSubstitution(payload) {
    return $fetch(`${config.public.apiBase}/foods/substitute`, authFetchInit({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }))
  }

  return {
    searchFoods,
    calculateSubstitution,
  }
}
