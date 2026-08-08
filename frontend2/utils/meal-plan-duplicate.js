function newId() {
  return crypto.randomUUID()
}

function cloneJson(value) {
  if (value == null) return null
  return JSON.parse(JSON.stringify(value))
}

function cloneMealItem(item) {
  if (!item || typeof item !== 'object') return item
  const next = {
    ...cloneJson(item),
    id: newId(),
  }

  if (Array.isArray(item.substitutions)) {
    next.substitutions = item.substitutions.map((sub) => ({
      ...cloneJson(sub),
      id: newId(),
    }))
  }

  if (item.recipeSnapshot && typeof item.recipeSnapshot === 'object') {
    next.recipeSnapshot = {
      ...cloneJson(item.recipeSnapshot),
      ingredients: (item.recipeSnapshot.ingredients || []).map((ingredient) => ({
        ...cloneJson(ingredient),
        id: newId(),
      })),
    }
  }

  if (item.per100g && typeof item.per100g === 'object') {
    next.per100g = { ...item.per100g }
  }

  return next
}

function cloneMeals(meals) {
  return (Array.isArray(meals) ? meals : []).map((meal) => ({
    ...cloneJson(meal),
    id: newId(),
    items: (meal.items || []).map(cloneMealItem),
    macros: meal.macros ? { ...meal.macros } : null,
    pdfMacros: meal.pdfMacros
      ? { ...meal.pdfMacros }
      : (meal.macros ? { ...meal.macros } : null),
  }))
}

export function duplicateMealPlanTitle(sourceTitle) {
  const base = String(sourceTitle || 'Plano alimentar').trim() || 'Plano alimentar'
  return `${base} (cópia)`
}

export function duplicateMealPlanRecord(record, options = {}) {
  if (!record || typeof record !== 'object') {
    throw new Error('Plano inválido para duplicar.')
  }

  const now = new Date().toISOString()
  const title = String(options.title || '').trim() || duplicateMealPlanTitle(record.title)

  return {
    ...cloneJson(record),
    id: newId(),
    title,
    status: 'draft',
    startDate: now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
    authorName: options.authorName || record.authorName || 'Nutricionista',
    meals: cloneMeals(record.meals),
    nutritionTotals: record.nutritionTotals ? { ...record.nutritionTotals } : null,
    pdfNutritionTotals: record.pdfNutritionTotals
      ? { ...record.pdfNutritionTotals }
      : (record.nutritionTotals ? { ...record.nutritionTotals } : null),
    hydrationPrescription: cloneJson(record.hydrationPrescription),
    shoppingList: cloneJson(record.shoppingList),
  }
}
