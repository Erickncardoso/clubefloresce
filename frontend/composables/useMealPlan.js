import { formatMealItemLabel, formatMealItemsLabels } from '~/utils/meal-plan-format'
import { normalizeMealPlanItem } from '~/utils/meal-plan-display-parse'
import { getMealIdForTimeFromMeals } from '~/utils/meal-plan-time'
import { pickMealIcon } from '~/utils/meal-slot-options'
import { useMealExtraItems } from '~/composables/useMealExtraItems'
import { useMealItemOverrides } from '~/composables/useMealItemOverrides'

function mapApiItem(item) {
  const normalized = normalizeMealPlanItem(item)
  return {
    key: normalized.key,
    food: normalized.name,
    name: normalized.name,
    amount: normalized.amount,
    unit: normalized.unit,
    grams: normalized.grams,
    ml: normalized.ml,
    display: normalized.display,
    substitutions: (normalized.substitutions || []).map(mapApiItem),
    itemType: normalized.itemType || null,
    recipeId: normalized.recipeId || null,
    recipe: normalized.recipe || null,
    foodId: normalized.foodId || null,
    foodSource: normalized.foodSource || null,
    per100g: normalized.per100g || null,
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
  const { applyExtraItemsToMeal, extrasRevision } = useMealExtraItems()

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
    extrasRevision.value
    const meals = apiMeals.value
    const index = meals.findIndex((meal) => meal.id === mealId)
    if (index < 0) return null
    const withOverrides = applyOverridesToMeal(mapApiMeal(meals[index], index, meals.length), mealId)
    return applyExtraItemsToMeal(withOverrides, mealId)
  }

  const currentMeal = computed(() => {
    overridesRevision.value
    extrasRevision.value
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
