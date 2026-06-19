/** Calculadora de substituição (metodologia 4nutris: TBCA + similaridade de cossenos). */

export function useFoodSubstitution() {
  const config = useRuntimeConfig()
  const patientAuth = usePatientAuth()

  async function searchFoods(query, limit = 12) {
    const q = String(query || '').trim()
    if (!q) return []

    const result = await $fetch(`${config.public.apiBase}/foods/search`, {
      headers: patientAuth.authHeaders(),
      query: { q, limit },
    })

    return result?.items || []
  }

  async function calculateSubstitution(payload) {
    return $fetch(`${config.public.apiBase}/foods/substitute`, {
      method: 'POST',
      headers: {
        ...patientAuth.authHeaders(),
        'Content-Type': 'application/json',
      },
      body: payload,
    })
  }

  return {
    searchFoods,
    calculateSubstitution,
  }
}
