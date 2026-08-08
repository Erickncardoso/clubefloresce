import { apiFetch, apiUpload } from '@/lib/api'
import type { FoodItemPer100g, MacroTotals, MealItem } from './types'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RecipeIngredient {
  id: string
  foodId: string
  foodSource: string | null
  name: string
  amount: string
  unit: string
  grams: number
  per100g: FoodItemPer100g | null
  matchStatus?: 'matched' | 'review' | 'unmatched'
  matchedFoodName?: string
}

export interface MealPlanRecipe {
  id: string
  title: string
  imageUrl: string
  imagePosition: string
  servingsLabel: string
  prepMinutes: number | null
  shareWithAll: boolean
  sharedPatientIds: string[]
  ingredients: RecipeIngredient[]
  steps: string
}

export interface RecipeSnapshot {
  id?: string
  title?: string
  imageUrl?: string | null
  imagePosition?: string
  servingsLabel?: string
  prepMinutes?: number | null
  ingredients?: RecipeIngredient[]
  steps?: string
  macros?: MacroTotals
}

// ─── Factory helpers ─────────────────────────────────────────────────────────

export function createEmptyRecipeIngredient(): RecipeIngredient {
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

export function createEmptyMealPlanRecipe(): MealPlanRecipe {
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

// ─── Macro computation ───────────────────────────────────────────────────────

function roundMacro(value: number): number {
  return Math.round(value * 10) / 10
}

export function computeIngredientMacros(ingredient: RecipeIngredient): MacroTotals | null {
  const per100g = ingredient?.per100g
  if (!per100g || per100g.caloriesKcal == null) return null
  const grams = Math.max(1, Math.round(Number(ingredient.grams) || 100))
  const ratio = grams / 100
  return {
    caloriesKcal: Math.round((per100g.caloriesKcal || 0) * ratio),
    carbsG: roundMacro((per100g.carbsG || 0) * ratio),
    proteinG: roundMacro((per100g.proteinG || 0) * ratio),
    fatG: roundMacro((per100g.fatG || 0) * ratio),
  }
}

export function computeRecipeMacros(recipe: Pick<MealPlanRecipe, 'ingredients'>): MacroTotals {
  const totals = { caloriesKcal: 0, carbsG: 0, proteinG: 0, fatG: 0 }
  for (const ingredient of recipe?.ingredients ?? []) {
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

export function recipeIngredientsMissingData(recipe: Pick<MealPlanRecipe, 'ingredients'>): RecipeIngredient[] {
  return (recipe?.ingredients ?? []).filter(
    (item) => !item?.per100g?.caloriesKcal && String(item?.name ?? '').trim(),
  )
}

// ─── Snapshot / meal-item helpers ────────────────────────────────────────────

export function snapshotRecipe(recipe: MealPlanRecipe): RecipeSnapshot {
  const macros = computeRecipeMacros(recipe)
  return {
    id: recipe.id,
    title: recipe.title,
    imageUrl: recipe.imageUrl || null,
    imagePosition: recipe.imagePosition || '50% 50%',
    servingsLabel: recipe.servingsLabel || '1 porção',
    prepMinutes: recipe.prepMinutes ?? null,
    ingredients: (recipe.ingredients ?? []).map((item) => ({ ...item })),
    steps: recipe.steps || '',
    macros,
  }
}

function macrosToPer100g(macros: MacroTotals | null): FoodItemPer100g | null {
  if (!macros?.caloriesKcal) return null
  return {
    caloriesKcal: macros.caloriesKcal,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
  }
}

export function createEmptyRecipeMealItem(recipe: MealPlanRecipe | null = null): MealItem {
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
    per100g: macrosToPer100g(macros),
    portionAmount: 1,
    portionMeasure: 'porcao',
    portionMode: 'measure',
    grams: null,
    ml: null,
    display: title,
  }
}

export function isRecipeMealItem(item: MealItem): boolean {
  return item?.itemType === 'recipe' || Boolean(item?.recipeId || item?.recipeSnapshot)
}

export function applyRecipeToMealItem(item: MealItem, recipe: MealPlanRecipe): MealItem {
  const snapshot = snapshotRecipe(recipe)
  return {
    ...item,
    itemType: 'recipe',
    recipeId: recipe.id,
    recipeSnapshot: snapshot,
    name: recipe.title,
    servingLabel: recipe.servingsLabel || '1 porção',
    unit: recipe.servingsLabel || 'porção',
    display: recipe.title,
    per100g: macrosToPer100g(snapshot.macros ?? null),
    grams: null,
  }
}

export function recipeDisplayLabel(item: MealItem): string {
  if (!isRecipeMealItem(item)) return item?.name || ''
  const label = item?.recipeSnapshot?.servingsLabel ?? item?.servingLabel ?? item?.unit
  return label ? `${item.name} (${label})` : (item.name || '')
}

export function ingredientMatchMeta(
  ingredient: RecipeIngredient,
): { status: 'matched' | 'review' | 'unmatched'; label: string } {
  const status =
    ingredient?.matchStatus ||
    (ingredient?.foodId && ingredient?.per100g?.caloriesKcal != null ? 'matched' : 'unmatched')

  if (status === 'matched') {
    return {
      status: 'matched',
      label: ingredient.matchedFoodName ? `TBCA/TACO: ${ingredient.matchedFoodName}` : 'Vinculado à base',
    }
  }
  if (status === 'review') {
    return {
      status: 'review',
      label: ingredient.matchedFoodName ? `Conferir: ${ingredient.matchedFoodName}` : 'Conferir vínculo',
    }
  }
  return { status: 'unmatched', label: 'Sem correspondência na base' }
}

// ─── API helpers ─────────────────────────────────────────────────────────────

export async function apiSaveRecipe(recipe: MealPlanRecipe): Promise<MealPlanRecipe> {
  const res = await apiFetch<{ item?: MealPlanRecipe }>('/meal-plan/recipes', {
    method: 'POST',
    body: JSON.stringify(recipe),
  })
  return (res.item ?? recipe) as MealPlanRecipe
}

export async function apiImportRecipe(
  file: File,
): Promise<{ draft: Partial<MealPlanRecipe>; warnings: string[] }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiFetch<{ draft?: Partial<MealPlanRecipe>; warnings?: string[] }>(
    '/meal-plan/recipes/import',
    { method: 'POST', body: formData },
  )
  return {
    draft: res.draft ?? {},
    warnings: res.warnings ?? [],
  }
}

export async function apiUploadRecipeCover(file: File): Promise<string> {
  const res = await apiUpload<{ url?: string; secure_url?: string }>('/upload', file)
  return res.url ?? res.secure_url ?? ''
}
