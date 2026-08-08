import type {
  MacroTotals,
  MealEntry,
  MealItem,
  MealPlanFormData,
  MealPlanMethodology,
  MealPlanRecord,
} from './types'

export const MEAL_PLAN_METHODOLOGIES = [
  {
    id: 'foods' as MealPlanMethodology,
    label: 'Inteligente',
    description:
      'Prescrição por alimentos com busca na tabela TBCA/TACO: quantidade, medida caseira e cálculo automático de macro e micronutrientes.',
  },
  {
    id: 'equivalents' as MealPlanMethodology,
    label: 'Tradicional',
    description:
      'Prescrição por grupos alimentares e porções equivalentes, com flexibilidade de escolha no cardápio.',
  },
  {
    id: 'qualitative' as MealPlanMethodology,
    label: 'Qualitativo',
    description:
      'Editor de texto livre e rico em formatação para planos descritivos — oriente por refeição, comportamento ou princípios, sem quantificar cada alimento.',
  },
]

export const MEAL_PLAN_DIET_TYPES = [
  'Equilibrada',
  'Low carb',
  'Cetogênica',
  'Vegetariana',
  'Vegana',
  'Sem lactose',
  'Sem glúten',
  'Personalizada',
]

export const FOOD_EQUIVALENT_GROUPS = [
  { id: 'cereals', label: 'Cereais e tubérculos', unit: 'porção', examples: 'arroz, batata doce, macarrão' },
  { id: 'vegetables', label: 'Verduras e legumes', unit: 'porção', examples: 'alface, cenoura, brócolis' },
  { id: 'fruits', label: 'Frutas', unit: 'porção', examples: 'banana, maçã, laranja' },
  { id: 'legumes', label: 'Leguminosas', unit: 'porção', examples: 'feijão, lentilha, grão-de-bico' },
  { id: 'meat', label: 'Carnes e ovos', unit: 'porção', examples: 'frango, peixe, ovo' },
  { id: 'dairy', label: 'Leite e derivados', unit: 'porção', examples: 'leite, iogurte, queijo' },
  { id: 'fats', label: 'Gorduras e oleaginosas', unit: 'porção', examples: 'azeite, castanha, abacate' },
  { id: 'sugars', label: 'Açúcares e doces', unit: 'porção', examples: 'mel, açúcar, chocolate' },
]

export const DEFAULT_MEAL_LABELS = [
  { time: '08:00', label: 'Café da manhã' },
  { time: '12:30', label: 'Almoço' },
  { time: '19:30', label: 'Jantar' },
]

export const MAX_MEAL_PLANS = 10

export function methodologyLabel(id: string): string {
  return MEAL_PLAN_METHODOLOGIES.find((item) => item.id === id)?.label ?? 'Prescrição'
}

export function statusLabel(status: string): string {
  if (status === 'active') return 'Ativo'
  if (status === 'archived') return 'Arquivado'
  return 'Rascunho'
}

export function statusTone(status: string): 'active' | 'archived' | 'draft' {
  if (status === 'active') return 'active'
  if (status === 'archived') return 'archived'
  return 'draft'
}

export function createEmptyMealItem(methodology: MealPlanMethodology = 'foods'): MealItem {
  if (methodology === 'equivalents') {
    const group = FOOD_EQUIVALENT_GROUPS[0]
    return {
      id: crypto.randomUUID(),
      groupId: group.id,
      name: group.label,
      amount: '1',
      unit: 'porção',
      options: group.examples,
      substitutions: [],
    }
  }
  return {
    id: crypto.randomUUID(),
    name: '',
    amount: '1',
    unit: '',
    groupId: '',
    options: '',
    substitutions: [],
    foodId: '',
    per100g: null,
    portionAmount: 1,
    portionMeasure: 'unidade',
    portionMode: 'measure',
    grams: null,
    ml: null,
  }
}

export function createEmptyMeal(methodology: MealPlanMethodology = 'foods'): MealEntry {
  return {
    id: crypto.randomUUID(),
    time: '12:00',
    label: 'Refeição',
    items: [],
    notes: '',
    macros: null,
  }
}

export function createEmptyPrescription(options: { title?: string; methodology?: MealPlanMethodology } = {}): MealPlanFormData {
  const now = new Date().toISOString().slice(0, 10)
  const methodology: MealPlanMethodology = options.methodology ?? 'qualitative'
  return {
    title: options.title?.trim() ?? '',
    methodology,
    status: 'draft',
    objective: '',
    dietType: '',
    startDate: now,
    endDate: '',
    indefinite: true,
    editorText: '',
    editorHtml: '',
    finalNotes: '',
    meals: DEFAULT_MEAL_LABELS.map((meal) => ({
      id: crypto.randomUUID(),
      time: meal.time,
      label: meal.label,
      items: [],
      notes: '',
      macros: null,
    })),
    nutritionTotals: null,
    hydrationPrescription: null,
    shoppingList: null,
  }
}

export function hydratePrescriptionFromRecord(record: MealPlanRecord | null): MealPlanFormData {
  if (!record) return createEmptyPrescription()
  const methodology: MealPlanMethodology = record.methodology ?? 'qualitative'
  const meals: MealEntry[] =
    Array.isArray(record.meals) && record.meals.length > 0
      ? record.meals.map((meal) => ({
          id: meal.id || crypto.randomUUID(),
          time: meal.time || '08:00',
          label: meal.label || 'Refeição',
          items: Array.isArray(meal.items)
            ? meal.items.map((item) => ({
                id: item.id || crypto.randomUUID(),
                foodId: item.foodId || '',
                linkedFoodName: item.linkedFoodName || '',
                foodSource: item.foodSource || '',
                groupId: item.groupId || '',
                name: item.name || '',
                amount: item.amount || '',
                unit: item.unit || '',
                options: item.options || '',
                display: item.display || '',
                grams: item.grams ?? null,
                ml: item.ml ?? null,
                per100g: item.per100g || null,
                portionAmount: item.portionAmount ?? null,
                portionMeasure: item.portionMeasure || '',
                itemType: item.itemType || '',
                recipeId: item.recipeId || '',
                recipeSnapshot: item.recipeSnapshot || null,
                servingLabel: item.servingLabel || '',
                substitutions: Array.isArray(item.substitutions) ? item.substitutions : [],
              }))
            : [],
          notes: meal.notes || '',
          macros: meal.macros || null,
          pdfMacros: meal.pdfMacros || (meal.macros ? { ...meal.macros } : null),
        }))
      : createEmptyPrescription({ methodology }).meals ?? []

  return {
    title: record.title || '',
    methodology,
    status: record.status || 'draft',
    objective: record.objective || '',
    dietType: record.dietType || '',
    startDate: record.startDate || new Date().toISOString().slice(0, 10),
    endDate: record.endDate || '',
    indefinite: record.indefinite !== false,
    editorText: record.editorText || '',
    editorHtml: record.editorHtml || '',
    finalNotes: record.finalNotes || '',
    meals,
    nutritionTotals: record.nutritionTotals || null,
    pdfNutritionTotals: record.pdfNutritionTotals || (record.nutritionTotals ? { ...record.nutritionTotals } : null),
    hydrationPrescription: record.hydrationPrescription || null,
    shoppingList: record.shoppingList || null,
  }
}

function roundMacroValue(value: number): number {
  return Math.round(value * 10) / 10
}

export function computeFoodItemMacros(item: MealItem): MacroTotals | null {
  if (item.itemType === 'recipe' || item.recipeSnapshot?.macros?.caloriesKcal) {
    const macros = item.recipeSnapshot?.macros
    if (macros?.caloriesKcal) {
      const servings = Math.max(0.1, Number(item.portionAmount ?? item.amount) || 1)
      return {
        caloriesKcal: Math.round((macros.caloriesKcal || 0) * servings),
        carbsG: roundMacroValue((macros.carbsG || 0) * servings),
        proteinG: roundMacroValue((macros.proteinG || 0) * servings),
        fatG: roundMacroValue((macros.fatG || 0) * servings),
      }
    }
  }
  const per100g = item.per100g
  if (!per100g || per100g.caloriesKcal == null) return null
  const grams = item.grams ?? (item.portionAmount != null ? Number(item.portionAmount) * 100 : 100)
  const ratio = grams / 100
  return {
    caloriesKcal: Math.round((per100g.caloriesKcal || 0) * ratio),
    carbsG: roundMacroValue((per100g.carbsG || 0) * ratio),
    proteinG: roundMacroValue((per100g.proteinG || 0) * ratio),
    fatG: roundMacroValue((per100g.fatG || 0) * ratio),
  }
}

export function sumMealItemsMacros(items: MealItem[]): MacroTotals {
  const totals = { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  for (const item of items ?? []) {
    const macros = computeFoodItemMacros(item)
    if (!macros) continue
    totals.caloriesKcal += macros.caloriesKcal || 0
    totals.carbsG += macros.carbsG || 0
    totals.proteinG += macros.proteinG || 0
    totals.fatG += macros.fatG || 0
  }
  return {
    caloriesKcal: Math.round(totals.caloriesKcal),
    carbsG: roundMacroValue(totals.carbsG),
    proteinG: roundMacroValue(totals.proteinG),
    fatG: roundMacroValue(totals.fatG),
  }
}

export function resolvedMealMacros(meal: MealEntry): MacroTotals {
  const fromItems = sumMealItemsMacros(meal.items ?? [])
  if ((fromItems.caloriesKcal || 0) > 0) return fromItems
  if (meal.macros?.caloriesKcal) {
    return {
      caloriesKcal: Math.round(meal.macros.caloriesKcal || 0),
      proteinG: roundMacroValue(meal.macros.proteinG || 0),
      carbsG: roundMacroValue(meal.macros.carbsG || 0),
      fatG: roundMacroValue(meal.macros.fatG || 0),
    }
  }
  return fromItems
}

export function computeLiveNutritionTotals(form: MealPlanFormData): MacroTotals {
  if (form.methodology !== 'foods' && form.methodology !== 'equivalents') {
    return {
      caloriesKcal: form.nutritionTotals?.caloriesKcal ?? 0,
      proteinG: form.nutritionTotals?.proteinG ?? 0,
      carbsG: form.nutritionTotals?.carbsG ?? 0,
      fatG: form.nutritionTotals?.fatG ?? 0,
    }
  }
  const totals = { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  for (const meal of form.meals ?? []) {
    const macros = resolvedMealMacros(meal)
    totals.caloriesKcal += macros.caloriesKcal || 0
    totals.proteinG += macros.proteinG || 0
    totals.carbsG += macros.carbsG || 0
    totals.fatG += macros.fatG || 0
  }
  if (!totals.caloriesKcal && form.nutritionTotals?.caloriesKcal) {
    return {
      caloriesKcal: Math.round(form.nutritionTotals.caloriesKcal || 0),
      proteinG: roundMacroValue(form.nutritionTotals.proteinG || 0),
      carbsG: roundMacroValue(form.nutritionTotals.carbsG || 0),
      fatG: roundMacroValue(form.nutritionTotals.fatG || 0),
    }
  }
  return {
    caloriesKcal: Math.round(totals.caloriesKcal),
    proteinG: roundMacroValue(totals.proteinG),
    carbsG: roundMacroValue(totals.carbsG),
    fatG: roundMacroValue(totals.fatG),
  }
}

export function formatMacroGrams(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const num = Number(value)
  if (num === 0) return '0g'
  return `${Number.isInteger(num) ? num : num.toFixed(1).replace(/\.0$/, '')}g`
}

export function formatMacroKcal(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '— Kcal'
  return `${Math.round(Number(value))} Kcal`
}

export function foodItemPortionLabel(item: MealItem): string {
  const display = String(item.display ?? '').trim()
  const name = String(item.name ?? '').trim()
  if (display && name && display.toLowerCase().startsWith(name.toLowerCase())) {
    const tail = display.slice(name.length).trim()
    if (tail) return tail
  }
  const amount = String(item.amount ?? '').trim()
  const unit = String(item.unit ?? '').trim()
  if (amount && unit) return `${amount} ${unit}`
  if (unit) return unit
  if (item.grams != null) return `${item.grams}g`
  if (item.ml != null) return `${item.ml}ml`
  return ''
}

export function formatEquivalentDisplay(item: MealItem): string {
  const name = String(item.name ?? '').trim()
  const amount = String(item.amount ?? '').trim()
  const unit = String(item.unit ?? 'porção').trim()
  const options = String(item.options ?? '').trim()
  if (!name) return ''
  let display = amount ? `${name} - ${amount} ${unit}` : name
  if (options) display += ` (${options})`
  return display
}

export function getAverageCalories(item: MealPlanRecord): string {
  const totals = item.pdfNutritionTotals ?? item.nutritionTotals ?? {}
  const kcal = Number((totals as Record<string, number>).caloriesKcal)
  if (Number.isFinite(kcal) && kcal > 0) return `${Math.round(kcal)} kcal`
  // Compute from meals if no stored totals
  let sum = 0
  for (const meal of item.meals ?? []) {
    const macros = resolvedMealMacros(meal)
    sum += macros.caloriesKcal || 0
  }
  return sum > 0 ? `${Math.round(sum)} kcal` : '—'
}

export function getMealPlanList(user: { patientProfileData?: { mealPlans?: MealPlanRecord[] }; patientProfile?: { mealPlans?: MealPlanRecord[] } } | null | undefined): MealPlanRecord[] {
  const fromUser = user?.patientProfileData?.mealPlans
  const fromProfile = user?.patientProfile?.mealPlans
  const list = Array.isArray(fromUser) ? fromUser : (Array.isArray(fromProfile) ? fromProfile : [])
  return [...list].sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
}

export function buildMealPlanRecord(
  formPayload: MealPlanFormData,
  status: 'draft' | 'active' | 'archived',
  existingRecord: MealPlanRecord | null,
  authorName = 'Nutricionista',
): MealPlanRecord {
  const now = new Date().toISOString()
  const id = formPayload.id ?? existingRecord?.id ?? crypto.randomUUID()
  return {
    id,
    title: formPayload.title?.trim() || existingRecord?.title || 'Plano alimentar',
    methodology: formPayload.methodology ?? existingRecord?.methodology ?? 'qualitative',
    status,
    objective: formPayload.objective ?? null,
    dietType: formPayload.dietType ?? null,
    startDate: formPayload.startDate ?? null,
    endDate: formPayload.indefinite ? null : (formPayload.endDate ?? null),
    indefinite: formPayload.indefinite !== false,
    editorText: formPayload.editorText ?? '',
    editorHtml: formPayload.editorHtml ?? '',
    finalNotes: formPayload.finalNotes ?? '',
    meals: formPayload.meals ?? [],
    nutritionTotals: formPayload.nutritionTotals ?? existingRecord?.nutritionTotals ?? null,
    pdfNutritionTotals: formPayload.pdfNutritionTotals ?? existingRecord?.pdfNutritionTotals ?? null,
    hydrationPrescription: formPayload.hydrationPrescription ?? existingRecord?.hydrationPrescription ?? null,
    shoppingList: formPayload.shoppingList ?? existingRecord?.shoppingList ?? null,
    authorName: authorName || existingRecord?.authorName || 'Nutricionista',
    createdAt: existingRecord?.createdAt ?? now,
    updatedAt: now,
  }
}

export function buildParsedMealPlanFromPrescription(prescription: MealPlanRecord, patientName: string | null = null) {
  let meals: unknown[] = []
  if (prescription.methodology === 'qualitative') {
    // For qualitative, generate a single meal from the text
    const text = prescription.editorText ?? prescription.editorHtml ?? ''
    if (text.trim()) {
      meals = [{ id: crypto.randomUUID(), label: prescription.title || 'Plano', items: [{ key: crypto.randomUUID(), name: text.trim(), display: text.trim() }], macros: { proteinG: 0, fatG: 0, carbsG: 0, caloriesKcal: 0 } }]
    }
  } else {
    meals = (prescription.meals ?? []).map((meal) => ({
      id: meal.id,
      time: meal.time || '08:00',
      label: meal.label || 'Refeição',
      items: (meal.items ?? [])
        .filter((item) => item.name?.trim())
        .map((item) => ({
          key: item.id || crypto.randomUUID(),
          name: item.name.trim(),
          amount: item.amount ? Number(String(item.amount).replace(',', '.')) : null,
          unit: item.unit || 'un',
          grams: item.grams ?? null,
          ml: item.ml ?? null,
          display: item.display?.trim() || `${item.name} ${item.amount ?? ''} ${item.unit ?? ''}`.trim(),
          substitutions: [],
          foodId: item.foodId || null,
          foodSource: item.foodSource || null,
          linkedFoodName: item.linkedFoodName || null,
          per100g: item.per100g || null,
        })),
      macros: meal.macros || { proteinG: 0, fatG: 0, carbsG: 0, caloriesKcal: 0 },
    }))
  }

  const nutritionTotals = prescription.nutritionTotals ?? { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  return {
    title: prescription.title?.trim() || 'Plano alimentar',
    patientName,
    prescribedAt: prescription.startDate ?? null,
    fileName: `${prescription.title || 'plano'}.prescricao`,
    meals,
    nutritionTotals,
    parserSource: prescription.nutritionTotals?.caloriesKcal ? 'dietbox' : 'ai',
  }
}
