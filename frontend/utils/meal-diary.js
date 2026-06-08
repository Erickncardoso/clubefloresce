import { findFoodById, findFoodByName, macrosForFood } from '~/config/food-suggestions'

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

export function normalizeItemFromAi(item) {
  const name = String(item.name || '').trim()
  const matched = findFoodByName(name)
  const base = {
    id: item.id || createMealItemId(),
    name,
    grams: Math.max(1, Math.round(Number(item.grams) || 100)),
    caloriesKcal: Math.max(0, Math.round(Number(item.caloriesKcal) || 0)),
    carbsG: roundMacro(item.carbsG || 0),
    proteinG: roundMacro(item.proteinG || 0),
    fatG: roundMacro(item.fatG || 0),
    foodId: matched?.id || null,
    source: matched ? 'food_bank' : 'ai',
    originalName: name,
  }

  if (matched) {
    return { ...base, ...macrosForFood(matched, base.grams) }
  }
  return base
}

export function applyFoodMatch(item, nameInput) {
  const name = String(nameInput || '').trim()
  const matched = findFoodByName(name) || findFoodById(item.foodId)
  const originalName = item.originalName || (item.source === 'ai' ? item.name : null)
  const renamed = originalName && name.toLowerCase() !== String(originalName).toLowerCase()

  let updated = {
    ...item,
    name: nameInput,
    foodId: matched?.id || null,
    source: matched ? 'food_bank' : renamed || item.source === 'manual' ? 'manual' : item.source || 'ai',
    originalName: originalName || (renamed ? item.name : null),
  }

  if (matched) {
    updated = { ...updated, ...macrosForFood(matched, updated.grams) }
  }

  return updated
}

export function scaleMealItem(item, newGrams) {
  const grams = Math.max(1, Math.round(Number(newGrams) || 1))
  const food = findFoodById(item.foodId) || findFoodByName(item.name)

  if (food && item.source === 'food_bank') {
    return {
      ...item,
      grams,
      ...macrosForFood(food, grams),
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

export function sumMealItems(items) {
  return items.reduce(
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
      source: item.source || (item.foodId ? 'food_bank' : 'manual'),
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
