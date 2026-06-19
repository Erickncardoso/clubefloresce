import { formatMealItemLabel, formatMealItemsLabels } from '~/utils/meal-plan-format'
import { getMealIdForTimeFromMeals } from '~/utils/meal-plan-time'
import { pickMealIcon } from '~/utils/meal-slot-options'

function mapApiItem(item) {
  return {
    key: item.key,
    food: item.name,
    name: item.name,
    amount: item.amount,
    unit: item.unit,
    grams: item.grams,
    ml: item.ml,
    display: item.display,
    substitutions: item.substitutions || [],
  }
}

function mapApiMeal(meal, index, total) {
  const items = (meal.items || []).map(mapApiItem)
  return {
    id: meal.id,
    time: meal.time,
    label: meal.label,
    index: index + 1,
    total,
    short: meal.label.split('-')[0].trim().split(':').pop()?.trim() || meal.label,
    icon: pickMealIcon(meal.label),
    items,
    itemLabels: items.map((item) => item.display || formatMealItemLabel(item)),
  }
}

export function useMealPlan(nowRef) {
  const { planRecord } = usePatientMealPlan()
  const { applyOverridesToMeal, overridesRevision } = useMealItemOverrides()

  const apiMeals = computed(() => planRecord.value?.plan?.meals ?? [])
  const mealOrder = computed(() => apiMeals.value.map((meal) => meal.id))

  const currentMealId = computed(() => {
    const meals = apiMeals.value
    if (!meals.length) return null
    return getMealIdForTimeFromMeals(meals, unref(nowRef) ?? new Date())
  })

  const mealList = computed(() =>
    apiMeals.value.map((meal, index) => {
      const mapped = mapApiMeal(meal, index, apiMeals.value.length)
      return {
        id: mapped.id,
        short: mapped.short.slice(0, 12),
        icon: mapped.icon,
        time: mapped.time,
        label: mapped.label,
      }
    }),
  )

  function getMealById(mealId) {
    overridesRevision.value
    const meals = apiMeals.value
    const index = meals.findIndex((meal) => meal.id === mealId)
    if (index < 0) return null
    return applyOverridesToMeal(mapApiMeal(meals[index], index, meals.length), mealId)
  }

  const currentMeal = computed(() => {
    overridesRevision.value
    if (!currentMealId.value) return null
    return getMealById(currentMealId.value)
  })

  function getItemLabels(mealId) {
    const meal = getMealById(mealId)
    return meal?.itemLabels ?? []
  }

  function getRawItems(mealId) {
    const meal = getMealById(mealId)
    return meal?.items ?? []
  }

  function getMealIdForTime(date = new Date()) {
    return getMealIdForTimeFromMeals(apiMeals.value, date)
  }

  return {
    planRecord,
    mealOrder,
    mealList,
    currentMealId,
    currentMeal,
    getMealById,
    getItemLabels,
    getRawItems,
    formatMealItemLabel,
    getMealIdForTime,
    hasPlan: computed(() => apiMeals.value.length > 0),
  }
}
