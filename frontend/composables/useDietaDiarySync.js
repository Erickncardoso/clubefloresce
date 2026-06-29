import { buildPlanDiaryItems } from '~/utils/plan-diary-sync'
import { normalizeMealItemsForSave } from '~/utils/meal-diary'

export function useDietaDiarySync() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase
  const { patientFetchInit } = usePatientLocalTime()
  const syncing = ref(false)
  const syncError = ref('')

  const syncTimers = new Map()

  async function syncMealCheck(mealId, meal, checkedStates, options = {}) {
    const { bumpRefresh = true } = options
    if (!mealId || !meal) return null

    syncing.value = true
    syncError.value = ''

    try {
      const items = buildPlanDiaryItems(meal, checkedStates)
      const res = await $fetch(`${apiBase}/food-diary/plan-check`, patientFetchInit({
        method: 'PUT',
        body: {
          mealType: mealId,
          mealLabel: meal.label || mealId,
          items: normalizeMealItemsForSave(items),
        },
      }))

      if (bumpRefresh) {
        const nutritionRefresh = useState('patient-nutrition-refresh', () => 0)
        nutritionRefresh.value += 1
      }

      return res.dailySummary ?? null
    } catch (err) {
      syncError.value = err?.data?.message || 'Não foi possível atualizar as calorias do dia.'
      return null
    } finally {
      syncing.value = false
    }
  }

  function queueSyncMealCheck(mealId, meal, checkedStates, onSynced, delayMs = 350) {
    const key = String(mealId)
    const existing = syncTimers.get(key)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      syncTimers.delete(key)
      void syncMealCheck(mealId, meal, checkedStates).then((summary) => {
        if (typeof onSynced === 'function') onSynced(summary)
      })
    }, delayMs)

    syncTimers.set(key, timer)
  }

  onBeforeUnmount(() => {
    syncTimers.forEach((timer) => clearTimeout(timer))
    syncTimers.clear()
  })

  return {
    syncing,
    syncError,
    syncMealCheck,
    queueSyncMealCheck,
  }
}
