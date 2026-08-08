import { macrosForFoodRecord } from '~/utils/food-bank'

export function createEmptyRecipeIngredient() {
  return {
    id: crypto.randomUUID(),
    foodId: '',
    foodSource: null,
    name: '',
    amount: '1',
    unit: 'unidade',
    grams: 100,
    per100g: null,
  }
}

export function createEmptyMealPlanRecipe() {
  return {
    id: '',
    title: '',
    imageUrl: '',
    imagePosition: '50% 50%',
    servingsLabel: '1 porção',
    prepMinutes: null,
    shareWithAll: false,
    sharedPatientIds: [],
    ingredients: [createEmptyRecipeIngredient()],
    steps: '',
  }
}

export function createEmptyRecipeMealItem(recipe = null) {
  const title = recipe?.title || 'Nova receita'
  const macros = recipe ? computeRecipeMacros(recipe) : null
  return {
    id: crypto.randomUUID(),
    itemType: 'recipe',
    recipeId: recipe?.id || '',
    recipeSnapshot: recipe ? snapshotRecipe(recipe) : null,
    name: title,
    amount: '1',
    unit: recipe?.servingsLabel || 'porção',
    servingLabel: recipe?.servingsLabel || '1 porção',
    options: '',
    foodId: '',
    per100g: macrosToPer100g(macros, recipe?.servingsLabel),
    portionAmount: 1,
    portionMeasure: 'porcao',
    portionMode: 'measure',
    grams: null,
    ml: null,
    display: title,
  }
}

function roundMacro(value) {
  return Math.round(Number(value) * 10) / 10
}

export function computeIngredientMacros(ingredient) {
  if (!ingredient?.per100g?.caloriesKcal && ingredient?.per100g?.caloriesKcal !== 0) return null
  const grams = Math.max(1, Math.round(Number(ingredient.grams) || 100))
  return macrosForFoodRecord({ per100g: ingredient.per100g }, grams)
}

export function computeRecipeMacros(recipe) {
  const totals = { caloriesKcal: 0, carbsG: 0, proteinG: 0, fatG: 0 }
  for (const ingredient of recipe?.ingredients || []) {
    const macros = computeIngredientMacros(ingredient)
    if (!macros) continue
    totals.caloriesKcal += macros.caloriesKcal || 0
    totals.carbsG += macros.carbsG || 0
    totals.proteinG += macros.proteinG || 0
    totals.fatG += macros.fatG || 0
  }
  return {
    caloriesKcal: Math.round(totals.caloriesKcal),
    carbsG: roundMacro(totals.carbsG),
    proteinG: roundMacro(totals.proteinG),
    fatG: roundMacro(totals.fatG),
  }
}

export function recipeIngredientsMissingData(recipe) {
  return (recipe?.ingredients || []).filter((item) => !item?.per100g?.caloriesKcal && item?.name?.trim())
}

export function snapshotRecipe(recipe) {
  const macros = computeRecipeMacros(recipe)
  return {
    id: recipe.id,
    title: recipe.title,
    imageUrl: recipe.imageUrl || null,
    imagePosition: recipe.imagePosition || '50% 50%',
    servingsLabel: recipe.servingsLabel || '1 porção',
    prepMinutes: recipe.prepMinutes ?? null,
    ingredients: (recipe.ingredients || []).map((item) => ({ ...item })),
    steps: recipe.steps || '',
    macros,
  }
}

function macrosToPer100g(macros, servingsLabel = '1 porção') {
  if (!macros?.caloriesKcal) return null
  return {
    caloriesKcal: macros.caloriesKcal,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
  }
}

export function isRecipeMealItem(item) {
  return item?.itemType === 'recipe' || Boolean(item?.recipeId || item?.recipeSnapshot)
}

export function applyRecipeToMealItem(item, recipe) {
  if (!item || !recipe) return item
  const snapshot = snapshotRecipe(recipe)
  item.itemType = 'recipe'
  item.recipeId = recipe.id
  item.recipeSnapshot = snapshot
  item.name = recipe.title
  item.servingLabel = recipe.servingsLabel || '1 porção'
  item.unit = recipe.servingsLabel || 'porção'
  item.display = recipe.title
  item.per100g = macrosToPer100g(snapshot.macros, recipe.servingsLabel)
  item.grams = null
  return item
}

export function recipeDisplayLabel(item) {
  if (!isRecipeMealItem(item)) return item?.name || ''
  const label = item?.recipeSnapshot?.servingsLabel || item?.servingLabel || item?.unit
  return label ? `${item.name} (${label})` : item.name
}

export function ingredientMatchMeta(ingredient) {
  const status = ingredient?.matchStatus
    || (ingredient?.foodId && ingredient?.per100g?.caloriesKcal != null ? 'matched' : 'unmatched')
  if (status === 'matched') {
    return {
      status: 'matched',
      label: ingredient.matchedFoodName ? `TBCA/TACO: ${ingredient.matchedFoodName}` : 'Vinculado à base',
    }
  }
  if (status === 'review') {
    return {
      status: 'review',
      label: ingredient.matchedFoodName
        ? `Conferir: ${ingredient.matchedFoodName}`
        : 'Conferir vínculo',
    }
  }
  return { status: 'unmatched', label: 'Sem correspondência na base' }
}
