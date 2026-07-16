import { macrosForFoodRecord } from '~/utils/food-bank'
import { resolveItemGrams } from '~/utils/meal-portion-measures.js'

export function roundMacro(value) {
  return Math.round(Number(value) * 10) / 10
}

export function createMealItemId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createMealItem(overrides = {}) {
  return {
    id: createMealItemId(),
    name: '',
    grams: 100,
    caloriesKcal: 0,
    carbsG: 0,
    proteinG: 0,
    fatG: 0,
    foodId: null,
    source: 'manual',
    originalName: null,
    ...overrides,
  }
}

export function normalizeItemFromAi(item, matchedFood = null) {
  const name = String(item.name || '').trim()
  const resolvedGrams = resolveItemGrams(item)
  const base = {
    id: item.id || createMealItemId(),
    name,
    grams: Math.max(1, Math.round(resolvedGrams)),
    caloriesKcal: Math.max(0, Math.round(Number(item.caloriesKcal) || 0)),
    carbsG: roundMacro(item.carbsG || 0),
    proteinG: roundMacro(item.proteinG || 0),
    fatG: roundMacro(item.fatG || 0),
    foodId: matchedFood?.id || item.foodId || null,
    source: matchedFood ? 'food_bank' : item.foodId ? 'food_bank' : 'ai',
    originalName: name,
  }

  if (matchedFood) {
    const grams = resolveItemGrams({
      ...item,
      name,
      grams: item.grams,
      portionAmount: item.portionAmount,
      portionMeasure: item.portionMeasure,
      amount: item.amount,
      unit: item.unit,
    })
    return { ...base, grams, ...macrosForFoodRecord(matchedFood, grams) }
  }
  return base
}

export function applyFoodMatch(item, nameInput, matchedFood = null) {
  const name = String(nameInput || '').trim()
  const originalName = item.originalName || (item.source === 'ai' ? item.name : null)
  const renamed = originalName && name.toLowerCase() !== String(originalName).toLowerCase()

  let updated = {
    ...item,
    name,
    foodId: matchedFood?.id || null,
    source: matchedFood ? 'food_bank' : renamed || item.source === 'manual' ? 'manual' : item.source || 'ai',
    originalName: originalName || (renamed ? item.name : null),
  }

  if (matchedFood) {
    const grams = resolveItemGrams({
      ...updated,
      name,
      grams: updated.grams,
      portionAmount: updated.portionAmount,
      portionMeasure: updated.portionMeasure,
      amount: updated.amount,
      unit: updated.unit,
    })
    updated = { ...updated, grams, ...macrosForFoodRecord(matchedFood, grams) }
  }

  return updated
}

export function scaleMealItem(item, newGrams, matchedFood = null) {
  const grams = Math.max(1, Math.round(Number(newGrams) || 1))

  if (matchedFood) {
    return {
      ...item,
      grams,
      foodId: matchedFood.id,
      source: 'food_bank',
      ...macrosForFoodRecord(matchedFood, grams),
    }
  }

  const ratio = grams / Math.max(item.grams || 1, 1)
  return {
    ...item,
    grams,
    caloriesKcal: Math.max(0, Math.round(item.caloriesKcal * ratio)),
    carbsG: roundMacro(item.carbsG * ratio),
    proteinG: roundMacro(item.proteinG * ratio),
    fatG: roundMacro(item.fatG * ratio),
  }
}

export function isItemCounted(item) {
  return Boolean(item?.foodId) && item?.source === 'food_bank'
}

export function stripUncountedMacros(item) {
  if (isItemCounted(item)) return item
  return {
    ...item,
    caloriesKcal: 0,
    carbsG: 0,
    proteinG: 0,
    fatG: 0,
    source: item.source === 'ai' ? 'ai' : item.source || 'manual',
  }
}

export function sumMealItems(items, { countedOnly = false } = {}) {
  const list = countedOnly ? items.filter(isItemCounted) : items
  return list.reduce(
    (acc, item) => ({
      caloriesKcal: acc.caloriesKcal + (item.caloriesKcal || 0),
      carbsG: roundMacro(acc.carbsG + (item.carbsG || 0)),
      proteinG: roundMacro(acc.proteinG + (item.proteinG || 0)),
      fatG: roundMacro(acc.fatG + (item.fatG || 0)),
    }),
    { caloriesKcal: 0, carbsG: 0, proteinG: 0, fatG: 0 },
  )
}

export function normalizeMealItemsForSave(items) {
  return items
    .map((item) => ({
      id: item.id || createMealItemId(),
      name: String(item.name || '').trim(),
      grams: Math.max(1, Math.round(Number(item.grams) || 1)),
      caloriesKcal: Math.max(0, Math.round(Number(item.caloriesKcal) || 0)),
      carbsG: roundMacro(item.carbsG || 0),
      proteinG: roundMacro(item.proteinG || 0),
      fatG: roundMacro(item.fatG || 0),
      foodId: item.foodId || null,
      source: item.source || (item.foodId ? 'food_bank' : item.caloriesKcal ? 'ai' : 'manual'),
      originalName: item.originalName || null,
    }))
    .filter((item) => item.name)
}

export function mealTypeLabel(mealType) {
  const map = {
    breakfast: 'Café da manhã',
    snack1: 'Lanche da manhã',
    lunch: 'Almoço',
    snack2: 'Lanche da tarde',
    dinner: 'Jantar',
  }
  return map[mealType] || 'Refeição'
}
