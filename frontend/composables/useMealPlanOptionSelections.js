import { authFetchInit } from '~/composables/useAuthSession.js'
import {
  findOptionGroupForMealId,
  groupMealOptions,
  needsMealOptionSelection,
} from '~/utils/meal-plan-options'

export function useMealPlanOptionSelections() {
  const config = useRuntimeConfig()
  const { planRecord } = usePatientMealPlan()
  const saving = useState('patient-meal-plan-selections-saving', () => false)
  const saveError = useState('patient-meal-plan-selections-error', () => '')

  const rawMeals = computed(() => planRecord.value?.plan?.meals ?? [])
  const selectedMealBySlot = computed(() => planRecord.value?.plan?.selectedMealBySlot || {})

  const optionGroups = computed(() => groupMealOptions(rawMeals.value))

  const needsOptionSelection = computed(() =>
    needsMealOptionSelection(rawMeals.value, selectedMealBySlot.value),
  )

  function optionGroupForMeal(mealId) {
    return findOptionGroupForMealId(rawMeals.value, mealId)
  }

  function mealHasOptionAlternatives(mealId) {
    return Boolean(optionGroupForMeal(mealId))
  }

  async function saveSelections(nextSelected) {
    if (!planRecord.value) {
      throw new Error('Nenhum plano alimentar carregado.')
    }

    saving.value = true
    saveError.value = ''

    try {
      const res = await $fetch(`${config.public.apiBase}/meal-plan/me/selections`, authFetchInit({
        method: 'PATCH',
        body: { selectedMealBySlot: nextSelected },
      }))
      planRecord.value = res.plan ?? planRecord.value
      return planRecord.value
    } catch (err) {
      const message = err?.data?.message || err?.message || 'Não foi possível salvar as opções.'
      saveError.value = message
      throw err
    } finally {
      saving.value = false
    }
  }

  return {
    rawMeals,
    selectedMealBySlot,
    optionGroups,
    needsOptionSelection,
    saving,
    saveError,
    optionGroupForMeal,
    mealHasOptionAlternatives,
    saveSelections,
  }
}
