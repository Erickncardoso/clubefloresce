import { formatMealItemLabel } from '~/utils/meal-plan-format'
import { useMealPlan } from '~/composables/useMealPlan'

export function useMealSubstitutions() {
  const { planRecord, getMealById } = useMealPlan()

  const pdfSource = computed(() => ({
    fileName: planRecord.value?.fileName || 'plano-alimentar.pdf',
    label: planRecord.value?.title || 'Plano alimentar prescrito',
  }))

  function getSubstitutionGroupsForMeal(mealId) {
    const meal = getMealById(mealId)
    if (!meal) return []

    return (meal.items || [])
      .filter((item) => item.substitutions?.length)
      .map((item) => ({
        key: item.key,
        prescribed: item,
        prescribedLabel: item.display || formatMealItemLabel(item),
        options: item.substitutions.map((option) => ({
          ...option,
          label: option.display || formatMealItemLabel(option),
          note: option.note
            || (option.substitutionType === 'group'
              ? 'Grupo alimentar'
              : option.substitutionType === 'recipe'
                ? 'Receita'
                : ''),
        })),
      }))
  }

  function mealHasSubstitutions(mealId) {
    return getSubstitutionGroupsForMeal(mealId).length > 0
  }

  return {
    pdfSource,
    getSubstitutionGroupsForMeal,
    mealHasSubstitutions,
  }
}
