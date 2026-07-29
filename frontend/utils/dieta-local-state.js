const DIETA_STORAGE_PREFIXES = ['dieta_overrides_', 'dieta_checks_', 'dieta_extras_']

export const DIETA_PLAN_SYNC_KEY = 'dieta_plan_sync_id'

/** Remove substituições, checks e extras do localStorage (todas as datas/refeições). */
export function clearDietaLocalStorage() {
  if (import.meta.server || typeof localStorage === 'undefined') return

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (key && DIETA_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key)
    }
  }
}

/**
 * Limpa estado local quando o plano muda de id (reupload ou troca de paciente).
 * @returns {boolean} true se limpou dados antigos
 */
export function syncDietaPlanIdentity(planId, { forceClear = false } = {}) {
  if (import.meta.server || typeof localStorage === 'undefined' || !planId) return false

  const previousId = localStorage.getItem(DIETA_PLAN_SYNC_KEY)
  const shouldClear = forceClear || (previousId && previousId !== planId)

  if (shouldClear) clearDietaLocalStorage()
  localStorage.setItem(DIETA_PLAN_SYNC_KEY, planId)

  return shouldClear
}
