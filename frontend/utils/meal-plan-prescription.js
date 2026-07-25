import { PORTION_MEASURES, amountToGrams, parseMeasureFromUnit, parsePortionAmount, resolveItemGrams, syncItemPortionGrams } from './meal-portion-measures.js'
import { normalizePer100gMacros, macrosAtGramsFromPer100g } from './food-macros.js'
import {
  FOOD_EQUIVALENT_GROUPS,
  findEquivalentGroup,
  formatPortionUnit,
} from './meal-plan-equivalent-groups.js'
import {
  htmlToQualitativeText,
  syncQualitativeEditorContent,
  textToQualitativeHtml,
} from './meal-plan-qualitative-html.js'
import {
  buildSubstitutionsForParsedPlan,
  ensureStructuredSubstitutions,
  migrateOptionsToSubstitutions,
  substitutionDisplayLine,
  syncItemSubstitutionsToLegacy,
} from './meal-plan-substitutions.js'

export const MEAL_PLAN_METHODOLOGIES = [
  {
    id: 'foods',
    label: 'Inteligente',
    description:
      'Prescrição por alimentos com busca na tabela TBCA/TACO: quantidade, medida caseira e cálculo automático de macro e micronutrientes.',
    advantages: 'Vantagens: maior precisão nutricional e substituições estruturadas para o paciente.',
    available: true,
  },
  {
    id: 'equivalents',
    label: 'Tradicional',
    description:
      'Prescrição por grupos alimentares e porções equivalentes, com flexibilidade de escolha no cardápio.',
    advantages: 'Vantagens: praticidade na prescrição e opções rápidas de substituição.',
    available: true,
  },
  {
    id: 'qualitative',
    label: 'Qualitativo',
    description:
      'Editor de texto livre e rico em formatação para planos descritivos — oriente por refeição, comportamento ou princípios, sem quantificar cada alimento.',
    advantages: 'Vantagens: liberdade de escrita e modelos reutilizáveis na sua biblioteca.',
    available: true,
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

export { FOOD_EQUIVALENT_GROUPS, findEquivalentGroup, formatPortionUnit } from './meal-plan-equivalent-groups.js'

export function createEmptyMealItem(methodology = 'foods') {
  if (methodology === 'equivalents') {
    const group = FOOD_EQUIVALENT_GROUPS[0]
    return {
      id: crypto.randomUUID(),
      groupId: group.id,
      name: group.label,
      amount: '1',
      unit: 'porção',
      options: group.examples,
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

export function formatEquivalentDisplay(item) {
  const name = String(item.name || '').trim()
  const amount = String(item.amount || '').trim()
  const unit = String(item.unit || formatPortionUnit(amount)).trim()
  const options = String(item.options || '').trim()
  if (!name) return ''
  let display = amount ? `${name} - ${amount} ${unit}` : name
  if (options) display += ` (${options})`
  return display
}

export function formatFoodDisplay(item) {
  const name = String(item.name || '').trim()
  const amount = String(item.amount || '').trim()
  const unit = String(item.unit || '').trim()
  if (item.display?.trim()) return item.display.trim()
  if (!name) return ''
  return amount ? `${name} - ${amount} ${unit}`.trim() : name
}

export function formatMacroGrams(value) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '—'
  const num = Number(value)
  if (num === 0) return '0g'
  return `${Number.isInteger(num) ? num : num.toFixed(1).replace(/\.0$/, '')}g`
}

export function formatMacroKcal(value) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '— Kcal'
  return `${Math.round(Number(value))} Kcal`
}

export function foodItemPortionLabel(item) {
  const display = String(item?.display || '').trim()
  const name = String(item?.name || '').trim()

  if (display && name && display.toLowerCase().startsWith(name.toLowerCase())) {
    const tail = display.slice(name.length).trim()
    if (tail) return tail
  }

  if (display) {
    const withoutName = splitDisplayPortion(display, name)
    if (withoutName.amount || withoutName.unit) {
      return withoutName.amount
        ? `${withoutName.amount} ${withoutName.unit}`.trim()
        : withoutName.unit
    }
    const tailMatch = display.match(/\s(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|½|¼|¾)\s+.+/i)
    if (tailMatch) return tailMatch[0].trim()
    if (name && display.length > name.length) return display.slice(name.length).trim()
  }

  const amount = String(item?.amount || '').trim()
  const unit = String(item?.unit || '').trim()
  if (amount && unit) return `${amount} ${unit}`
  if (unit) return unit
  if (item?.grams != null) return `${item.grams}g`
  if (item?.ml != null) return `${item.ml}ml`
  return ''
}

export function normalizeFoodEditorItem(item) {
  if (!item || typeof item !== 'object') return item

  const display = String(item.display || '').trim()
  if (!display) return item

  const qtyMatch = display.match(
    /^(.+?)\s+(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|½|¼|¾)\s+(.+)$/i,
  )
  if (qtyMatch) {
    item.name = qtyMatch[1].trim()
    item.amount = qtyMatch[2].replace(',', '.').replace('½', '0.5').replace('¼', '0.25').replace('¾', '0.75')
    item.unit = qtyMatch[3].trim()
  } else if (/à vontade/i.test(display)) {
    item.name = display.replace(/\s*à vontade.*$/i, '').trim()
    item.unit = 'à vontade'
  }

  const gramsMatch = display.match(/\((\d+(?:\.\d+)?)\s*g\)/i)
  const mlMatch = display.match(/\((\d+(?:\.\d+)?)\s*ml\)/i)
  item.grams = gramsMatch ? Number(gramsMatch[1]) : (item.grams ?? null)
  item.ml = mlMatch ? Number(mlMatch[1]) : (item.ml ?? null)

  return item
}

export function updateFoodItemPortion(item, rawValue) {
  const value = String(rawValue || '').trim()
  item.display = item.name?.trim() ? `${item.name.trim()} ${value}`.trim() : value
  const parsed = splitDisplayPortion(item.display, item.name)
  item.amount = parsed.amount
  item.unit = parsed.unit
  const gramsMatch = value.match(/\((\d+(?:\.\d+)?)\s*g\)/i)
  const mlMatch = value.match(/\((\d+(?:\.\d+)?)\s*ml\)/i)
  item.grams = gramsMatch ? Number(gramsMatch[1]) : null
  item.ml = mlMatch ? Number(mlMatch[1]) : null
}

export function applyFoodItemMeasure(item, { measureId, amount, grams }) {
  if (!item || typeof item !== 'object') return item
  const qty = Math.max(0.1, Number(amount) || 1)
  const safeGrams = Math.max(1, Math.round(Number(grams) || 100))
  item.portionAmount = qty
  item.portionMeasure = measureId || 'unidade'
  item.portionMode = measureId === 'grams' ? 'grams' : 'measure'
  item.grams = safeGrams
  item.amount = String(measureId === 'grams' ? safeGrams : qty)
  if (measureId === 'grams') {
    item.unit = 'Gramas'
  } else if (measureId === 'porcao_media') {
    item.unit = 'Porção média'
  } else {
    const measure = PORTION_MEASURES.find((entry) => entry.id === measureId)
    item.unit = measure?.label || 'Unidade(s)'
  }
  const portionLabel = `${item.amount} ${item.unit}${safeGrams ? ` (${safeGrams}g)` : ''}`.trim()
  item.display = item.name?.trim() ? `${item.name.trim()} ${portionLabel}`.trim() : portionLabel
  return item
}

export function computeFoodItemMacros(item) {
  if (item?.itemType === 'recipe' || item?.recipeSnapshot?.macros) {
    const macros = item.recipeSnapshot?.macros
    if (macros?.caloriesKcal) {
      const servings = Math.max(0.1, Number(item?.portionAmount ?? item?.amount) || 1)
      return {
        caloriesKcal: Math.round((macros.caloriesKcal || 0) * servings),
        carbsG: roundMacroValue((macros.carbsG || 0) * servings),
        proteinG: roundMacroValue((macros.proteinG || 0) * servings),
        fatG: roundMacroValue((macros.fatG || 0) * servings),
      }
    }
  }
  const per100g = item?.per100g
  if (!per100g || per100g.caloriesKcal == null) return null
  const foodRecord = {
    source: item.foodSource || item.source || '',
    per100g,
    nutrients: item.nutrientsPer100g ? { per100g: item.nutrientsPer100g } : item.nutrients || null,
  }
  const grams = resolveItemGrams(item)
  const normalized = normalizePer100gMacros(foodRecord)
  const macros = macrosAtGramsFromPer100g(normalized, grams)
  return {
    caloriesKcal: macros.caloriesKcal,
    carbsG: macros.carbsG,
    proteinG: macros.proteinG,
    fatG: macros.fatG,
  }
}

export function sumMealItemsMacros(items) {
  const totals = { caloriesKcal: 0, carbsG: 0, proteinG: 0, fatG: 0 }
  for (const item of items || []) {
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

function roundMacroValue(value) {
  return Math.round(Number(value) * 10) / 10
}

export function hasFoodSubstitutions(item) {
  return parseSubstitutionList(item).length > 0
}

export function parseSubstitutionList(item) {
  if (Array.isArray(item?.substitutions) && item.substitutions.length) {
    return item.substitutions
      .map((sub) => substitutionDisplayLine(sub))
      .filter(Boolean)
  }

  const fromOptions = String(item?.options || '')
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (fromOptions.length) return fromOptions

  return (item?.substitutions || [])
    .map((sub) => String(sub?.display || sub?.name || '').trim())
    .filter(Boolean)
}

export function syncItemSubstitutionOptions(item) {
  if (!item || typeof item !== 'object') return
  ensureStructuredSubstitutions(item)
  syncItemSubstitutionsToLegacy(item)
}

export function formatSubstitutionOptionsText(item) {
  return parseSubstitutionList(item).join('\n')
}

function splitDisplayPortion(display, name) {
  const rest = String(display || '').trim()
  const foodName = String(name || '').trim()
  let tail = rest
  if (foodName && rest.toLowerCase().startsWith(foodName.toLowerCase())) {
    tail = rest.slice(foodName.length).trim()
  }
  if (!tail) return { amount: '', unit: '' }
  const match = tail.match(/^(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|½|¼|¾)\s+(.+)$/i)
  if (!match) return { amount: '', unit: tail }
  return {
    amount: match[1].replace(',', '.').replace('½', '0.5').replace('¼', '0.25').replace('¾', '0.75'),
    unit: match[2].trim(),
  }
}

export const DEFAULT_MEAL_LABELS = [
  { time: '08:00', label: 'Café da manhã' },
  { time: '12:30', label: 'Almoço' },
  { time: '19:30', label: 'Jantar' },
]

export const QUALITATIVE_PLACEHOLDER = `08:30 - Café da Manhã / Opção 1
Banana - 1 un
Aveia - 5 col. (sopa)
Iogurte natural - 170 g

12:30 - Almoço
Arroz integral - 4 col. (sopa)
Feijão - 1 concha
Frango grelhado - 120 g
Salada verde - à vontade

!- Whey protein - 1 scoop
#- Beber 2 L de água ao longo do dia`

export function createEmptyPrescription({ title = '', methodology = 'qualitative' } = {}) {
  const now = new Date().toISOString().slice(0, 10)
  return {
    title: title.trim(),
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

export function normalizeEquivalentItem(item) {
  const next = { ...item }
  let group = next.groupId ? findEquivalentGroup(next.groupId) : null
  if (!group && next.name) {
    group = FOOD_EQUIVALENT_GROUPS.find((entry) => entry.label === next.name) || null
  }
  if (group) {
    next.groupId = group.id
    next.name = group.label
  } else {
    next.groupId = next.groupId || 'other'
    next.name = next.name || 'Outro grupo'
  }
  next.unit = formatPortionUnit(next.amount)
  return next
}

export function copyMacroBlock(value) {
  if (!value || typeof value !== 'object') return null
  return {
    caloriesKcal: Math.round(Number(value.caloriesKcal) || 0),
    proteinG: roundMacroValue(value.proteinG || 0),
    carbsG: roundMacroValue(value.carbsG || 0),
    fatG: roundMacroValue(value.fatG || 0),
    goalType: value.goalType || 'general',
    includeCalories: value.includeCalories !== false,
    proteinPct: value.proteinPct != null ? roundMacroValue(value.proteinPct) : null,
    carbsPct: value.carbsPct != null ? roundMacroValue(value.carbsPct) : null,
    fatPct: value.fatPct != null ? roundMacroValue(value.fatPct) : null,
    proteinGPerKg: value.proteinGPerKg != null ? roundMacroValue(value.proteinGPerKg) : null,
    carbsGPerKg: value.carbsGPerKg != null ? roundMacroValue(value.carbsGPerKg) : null,
    fatGPerKg: value.fatGPerKg != null ? roundMacroValue(value.fatGPerKg) : null,
    patientWeightKg: value.patientWeightKg != null ? roundMacroValue(value.patientWeightKg) : null,
  }
}

/** Linhas do Relatório de nutrientes (ordem Dietbox: PTN, LIP, CHO, Kcal). */
export function buildFaithfulPdfReportRows(meals, pdfNutritionTotals = null) {
  const rows = (meals || []).map((meal) => {
    const source = meal.pdfMacros || meal.macros
    return {
      id: meal.id,
      label: `${meal.time || '—'} · ${meal.label || 'Refeição'}`,
      proteinG: source?.proteinG ?? null,
      fatG: source?.fatG ?? null,
      carbsG: source?.carbsG ?? null,
      caloriesKcal: source?.caloriesKcal ?? null,
    }
  })

  const summed = rows.reduce((acc, row) => {
    acc.proteinG += Number(row.proteinG) || 0
    acc.fatG += Number(row.fatG) || 0
    acc.carbsG += Number(row.carbsG) || 0
    acc.caloriesKcal += Number(row.caloriesKcal) || 0
    return acc
  }, { proteinG: 0, fatG: 0, carbsG: 0, caloriesKcal: 0 })

  const totals = copyMacroBlock(pdfNutritionTotals) || copyMacroBlock(summed)

  return { rows, totals }
}

/** Composição detalhada alimento a alimento (TBCA calculado). */
export function buildFaithfulFoodCompositionRows(meals) {
  const rows = []
  for (const meal of meals || []) {
    const mealLabel = `${meal.time || '—'} · ${meal.label || 'Refeição'}`
    for (const item of meal.items || []) {
      const name = String(item.name || '').trim()
      if (!name) continue
      const macros = computeFoodItemMacros(item)
      rows.push({
        id: `${meal.id}-${item.id}`,
        mealLabel,
        name,
        portion: foodItemPortionLabel(item) || '—',
        carbsG: macros?.carbsG ?? null,
        proteinG: macros?.proteinG ?? null,
        fatG: macros?.fatG ?? null,
        caloriesKcal: macros?.caloriesKcal ?? null,
        linked: Boolean(item.per100g?.caloriesKcal != null),
      })
    }
  }
  const totals = rows.reduce((acc, row) => {
    acc.carbsG += Number(row.carbsG) || 0
    acc.proteinG += Number(row.proteinG) || 0
    acc.fatG += Number(row.fatG) || 0
    acc.caloriesKcal += Number(row.caloriesKcal) || 0
    return acc
  }, { carbsG: 0, proteinG: 0, fatG: 0, caloriesKcal: 0 })

  return {
    rows,
    totals: {
      carbsG: roundMacroValue(totals.carbsG),
      proteinG: roundMacroValue(totals.proteinG),
      fatG: roundMacroValue(totals.fatG),
      caloriesKcal: Math.round(totals.caloriesKcal),
    },
  }
}

export function hydratePrescriptionFromRecord(record) {
  if (!record) return createEmptyPrescription()
  const methodology = record.methodology || 'qualitative'
  const meals = Array.isArray(record.meals) && record.meals.length
    ? record.meals.map((meal) => ({
        id: meal.id || crypto.randomUUID(),
        time: meal.time || '08:00',
        label: meal.label || 'Refeição',
        items: Array.isArray(meal.items)
          ? meal.items.map((item) => {
              const base = normalizeFoodEditorItem({
                id: item.id || crypto.randomUUID(),
                foodId: item.foodId || '',
                linkedFoodName: item.linkedFoodName || '',
                foodSource: item.foodSource || '',
                groupId: item.groupId || '',
                name: item.name || '',
                amount: item.amount || '',
                unit: item.unit || '',
                options: formatSubstitutionOptionsText(item),
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
                substitutions: Array.isArray(item.substitutions) && item.substitutions.length
                  ? item.substitutions
                  : migrateOptionsToSubstitutions(item),
              })
              return methodology === 'equivalents' ? normalizeEquivalentItem(base) : base
            })
          : [],
        notes: meal.notes || '',
        macros: meal.macros || null,
        pdfMacros: meal.pdfMacros || (meal.macros ? copyMacroBlock(meal.macros) : null),
      }))
    : createEmptyPrescription({ methodology }).meals
  return {
    title: record.title || '',
    methodology: record.methodology || 'qualitative',
    status: record.status || 'draft',
    objective: record.objective || '',
    dietType: record.dietType || '',
    startDate: record.startDate || new Date().toISOString().slice(0, 10),
    endDate: record.endDate || '',
    indefinite: record.indefinite !== false,
    editorText: record.editorText || '',
    editorHtml: record.editorHtml || textToQualitativeHtml(record.editorText || ''),
    finalNotes: record.finalNotes || '',
    meals,
    nutritionTotals: record.nutritionTotals || null,
    pdfNutritionTotals: record.pdfNutritionTotals
      || (record.nutritionTotals ? copyMacroBlock(record.nutritionTotals) : null),
    hydrationPrescription: record.hydrationPrescription || null,
    shoppingList: record.shoppingList || null,
  }
}

function parseAmountUnit(line) {
  const match = line.match(/^(.+?)\s-\s(\d+(?:[.,]\d+)?)\s(.+)$/)
  if (!match) return null
  return {
    name: match[1].trim(),
    amount: match[2].replace(',', '.'),
    unit: match[3].trim(),
  }
}

export function parseQualitativeEditorText(text) {
  const lines = String(text || '').split(/\r?\n/)
  const meals = []
  let current = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith('#-')) continue

    const mealMatch = line.match(/^(\d{1,2}:\d{2})\s*-\s*(.+)$/)
    if (mealMatch) {
      if (current?.items.length) meals.push(current)
      current = {
        id: crypto.randomUUID(),
        time: mealMatch[1],
        label: mealMatch[2].split('/')[0].trim(),
        items: [],
      }
      continue
    }

    if (!current) {
      current = {
        id: crypto.randomUUID(),
        time: '08:00',
        label: 'Plano alimentar',
        items: [],
      }
    }

    const supplement = line.startsWith('!-') ? line.slice(2).trim() : line
    const parsed = parseAmountUnit(supplement)
    if (parsed) {
      current.items.push({
        key: crypto.randomUUID(),
        name: parsed.name,
        amount: Number(parsed.amount) || null,
        unit: parsed.unit,
        grams: null,
        ml: null,
        display: `${parsed.name} - ${parsed.amount} ${parsed.unit}`,
        substitutions: [],
      })
    } else {
      current.items.push({
        key: crypto.randomUUID(),
        name: supplement,
        amount: null,
        unit: '',
        grams: null,
        ml: null,
        display: supplement,
        substitutions: [],
      })
    }
  }

  if (current?.items.length) meals.push(current)
  return meals
}

export function importPrescriptionIdForMealPlan(mealPlan) {
  const planId = mealPlan?.id
  if (planId) return `pdf-import-${planId}`
  const fileName = String(mealPlan?.fileName || mealPlan?.plan?.fileName || '').trim()
  if (!fileName) return null
  return `pdf-import-${slugifyImportKey(fileName)}`
}

function slugifyImportKey(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function parsePrescribedDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return new Date().toISOString().slice(0, 10)
  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return new Date().toISOString().slice(0, 10)
}

/** Candidatos de busca TBCA/TACO para nomes compostos do Dietbox. */
export function extractFoodMatchCandidates(rawName) {
  let name = String(rawName || '').trim()
  if (!name) return []

  name = name
    .replace(/\(\s*marca\s*:[^)]*\)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const candidates = []
  const push = (value) => {
    const cleaned = String(value || '')
      .trim()
      .replace(/^[-–—]\s*/, '')
      .replace(/\([^)]{3,}\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (cleaned.length >= 3 && !candidates.includes(cleaned)) candidates.push(cleaned)
  }

  push(name)
  push(name.replace(/[/|+]/g, ' ').replace(/\s+/g, ' ').trim())

  for (const altPart of name.split(/\s+ou\s+/i)) {
    for (const slashPart of altPart.split(/[/|+]/)) {
      push(slashPart)
    }
  }

  return [...candidates].sort((a, b) => a.length - b.length)
}

function mapParsedItemToEditorItem(item) {
  const substitutions = (item.substitutions || [])
    .map((sub) => sub.display || sub.name)
    .filter(Boolean)

  const name = String(item.name || '').trim()
  const fromDisplay = splitDisplayPortion(item.display, name)

  let amount = fromDisplay.amount
  let unit = fromDisplay.unit

  if (!amount && item.amount != null && item.amount !== '') {
    amount = String(item.amount)
  }
  if (!unit && item.unit) {
    unit = item.unit
    if (item.grams != null) unit = `${unit} (${item.grams}g)`.replace(/\s+\(/, ' (')
    else if (item.ml != null) unit = `${unit} (${item.ml}ml)`.replace(/\s+\(/, ' (')
  }
  if (!unit && item.grams != null) {
    amount = amount || String(item.grams)
    unit = 'g'
  } else if (!unit && item.ml != null) {
    amount = amount || String(item.ml)
    unit = 'ml'
  } else if (!unit && item.unit === 'avontade') {
    unit = 'à vontade'
  }

  const id = item.key || crypto.randomUUID()
  const amountNum = parsePortionAmount(amount)
  const measureId = parseMeasureFromUnit(unit) || 'unidade'
  const resolvedGrams = item.grams ?? (
    amountNum != null ? amountToGrams(amountNum, measureId, name) : null
  )
  const base = normalizeFoodEditorItem({
    id,
    foodId: item.foodId || '',
    linkedFoodName: item.linkedFoodName || '',
    foodSource: item.foodSource || '',
    name,
    amount,
    unit,
    display: item.display || '',
    grams: resolvedGrams,
    ml: item.ml ?? null,
    options: substitutions.join('\n'),
    groupId: '',
    per100g: item.per100g || null,
    portionAmount: measureId === 'grams'
      ? (resolvedGrams ?? amountNum ?? 100)
      : (amountNum ?? item.portionAmount ?? 1),
    portionMeasure: measureId === 'grams' ? 'grams' : measureId,
  })

  return { id, ...base }
}

export function resolvedMealMacros(meal) {
  const fromItems = sumMealItemsMacros(meal?.items || [])
  if ((fromItems.caloriesKcal || 0) > 0) return fromItems
  if (meal?.macros?.caloriesKcal) {
    return {
      caloriesKcal: Math.round(meal.macros.caloriesKcal || 0),
      proteinG: roundMacroValue(meal.macros.proteinG || 0),
      carbsG: roundMacroValue(meal.macros.carbsG || 0),
      fatG: roundMacroValue(meal.macros.fatG || 0),
    }
  }
  return fromItems
}

export function computeExtendedNutrients(item) {
  const per100g = item?.per100g
  if (!per100g) return null
  const grams = resolveItemGrams(item)
  const ratio = grams / 100
  return {
    fiberG: roundMacroValue((per100g.fiberG || 0) * ratio),
    sodiumMg: roundMacroValue((per100g.sodiumMg || 0) * ratio),
  }
}

export function sumExtendedNutrients(items) {
  const totals = { fiberG: 0, sodiumMg: 0 }
  for (const item of items || []) {
    const ext = computeExtendedNutrients(item)
    if (!ext) continue
    totals.fiberG += ext.fiberG || 0
    totals.sodiumMg += ext.sodiumMg || 0
  }
  return {
    fiberG: roundMacroValue(totals.fiberG),
    sodiumMg: roundMacroValue(totals.sodiumMg),
  }
}

function applyMatchedFoodToItem(item, food) {
  if (!food?.per100g) return false
  item.foodId = food.id || ''
  item.linkedFoodName = food.displayName || food.name || ''
  item.foodSource = food.source || ''
  item.per100g = food.per100g
  item.nutrientsPer100g = food.nutrientsPer100g || food.nutrients?.per100g || null
  const grams = syncItemPortionGrams(item)
  if (item.portionMeasure === 'grams') {
    applyFoodItemMeasure(item, {
      measureId: 'grams',
      amount: grams,
      grams,
    })
  } else if (item.portionAmount != null && item.portionMeasure) {
    applyFoodItemMeasure(item, {
      measureId: item.portionMeasure,
      amount: item.portionAmount,
      grams,
    })
  } else {
    applyFoodItemMeasure(item, {
      measureId: 'grams',
      amount: grams,
      grams,
    })
  }
  return true
}

export async function enrichPrescriptionFoodItems(
  prescription,
  matchFoodByName,
  { matchFoodBatch, onProgress } = {},
) {
  if (!prescription || prescription.methodology !== 'foods') {
    return { prescription, changed: false }
  }

  let changed = false
  const meals = (prescription.meals || []).map((meal) => ({
    ...meal,
    items: [...(meal.items || [])],
  }))

  const pending = []
  for (const meal of meals) {
    for (const item of meal.items) {
      if (item.itemType === 'recipe' || item.recipeSnapshot || item.recipeId) continue
      if (item.per100g?.caloriesKcal != null) continue
      if (!String(item.name || '').trim()) continue
      pending.push(item)
    }
  }

  if (!pending.length) return { prescription, changed: false }

  onProgress?.({ done: 0, total: pending.length, phase: 'start' })

  if (typeof matchFoodBatch === 'function') {
    const matches = await matchFoodBatch(
      pending.map((item) => ({ key: item.id, name: item.name })),
    )

    pending.forEach((item, index) => {
      const food = matches.get?.(item.id) ?? matches[item.id]
      if (applyMatchedFoodToItem(item, food)) changed = true
      onProgress?.({ done: index + 1, total: pending.length, phase: 'item' })
    })
  } else if (typeof matchFoodByName === 'function') {
    const concurrency = 8
    let done = 0

    async function enrichItem(item) {
      const candidates = extractFoodMatchCandidates(item.name)
      for (const candidate of candidates) {
        const food = await matchFoodByName(candidate)
        if (applyMatchedFoodToItem(item, food)) {
          changed = true
          break
        }
      }
      done += 1
      onProgress?.({ done, total: pending.length, phase: 'item' })
    }

    await mapWithConcurrency(pending, concurrency, enrichItem)
  }

  for (const meal of meals) {
    meal.macros = resolvedMealMacros(meal)
  }

  if (!changed) return { prescription, changed: false }
  return {
    prescription: { ...prescription, meals },
    changed: true,
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  if (!items.length) return
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      await mapper(items[index], index)
    }
  }
  const workers = Math.min(Math.max(concurrency, 1), items.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
}

export function buildQualitativeEditorTextFromParsedPlan(parsedPlan) {
  const lines = []
  for (const meal of parsedPlan?.meals || []) {
    lines.push(`${meal.time || '08:00'} - ${meal.label || 'Refeição'}`)
    for (const item of meal.items || []) {
      lines.push(item.display || item.name || '')
      for (const sub of item.substitutions || []) {
        if (sub.display || sub.name) {
          lines.push(`  ou ${sub.display || sub.name}`)
        }
      }
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

export function buildPrescriptionFromParsedPlan(parsedPlan, {
  id = null,
  status = 'active',
  fileName = '',
  updatedAt = null,
  authorName = 'Importado do PDF',
} = {}) {
  const now = new Date().toISOString()
  const meals = (parsedPlan?.meals || []).map((meal) => ({
    id: meal.id || crypto.randomUUID(),
    time: meal.time || '08:00',
    label: meal.label || 'Refeição',
    notes: '',
    macros: meal.macros ? copyMacroBlock(meal.macros) : null,
    pdfMacros: meal.macros ? copyMacroBlock(meal.macros) : null,
    items: (meal.items || []).map(mapParsedItemToEditorItem),
  }))

  const title = parsedPlan?.title?.trim() || 'Plano alimentar'
  const importNote = fileName
    ? `Importado automaticamente do PDF (${fileName}).`
    : 'Importado automaticamente do PDF.'

  return {
    id: id || crypto.randomUUID(),
    title,
    methodology: 'foods',
    status,
    objective: '',
    dietType: '',
    startDate: parsePrescribedDate(parsedPlan?.prescribedAt),
    endDate: '',
    indefinite: true,
    editorText: buildQualitativeEditorTextFromParsedPlan(parsedPlan),
    finalNotes: importNote,
    meals,
    nutritionTotals: parsedPlan?.nutritionTotals ? copyMacroBlock(parsedPlan.nutritionTotals) : null,
    pdfNutritionTotals: parsedPlan?.nutritionTotals ? copyMacroBlock(parsedPlan.nutritionTotals) : null,
    authorName,
    createdAt: updatedAt || now,
    updatedAt: updatedAt || now,
  }
}

export function findImportedPrescription(prescriptions, mealPlan) {
  const importId = importPrescriptionIdForMealPlan(mealPlan)
  if (!importId) return null
  return (prescriptions || []).find((item) => item.id === importId) || null
}

export function shouldSyncImportedPrescription(mealPlan, existing) {
  const parsed = mealPlan?.plan
  if (!parsed?.meals?.length) return false
  if (!existing) return true

  const mealPlanUpdated = mealPlan?.updatedAt ? new Date(mealPlan.updatedAt).getTime() : 0
  const prescriptionUpdated = existing?.updatedAt ? new Date(existing.updatedAt).getTime() : 0

  // Prescrição editada/salva pelo nutri — nunca sobrescrever com o PDF importado
  if (prescriptionUpdated && (!mealPlanUpdated || prescriptionUpdated >= mealPlanUpdated)) {
    return false
  }

  if (mealPlanUpdated > prescriptionUpdated) return true

  const parsedMealCount = parsed.meals.length
  const parsedItemCount = parsed.meals.reduce((sum, meal) => sum + (meal.items?.length || 0), 0)
  const existingMealCount = existing.meals?.length || 0
  const existingItemCount = (existing.meals || []).reduce((sum, meal) => sum + (meal.items?.length || 0), 0)
  const missingMacros = (existing.meals || []).some((meal) => !meal.macros?.caloriesKcal)
    && parsed.meals.some((meal) => meal.macros?.caloriesKcal)
  const missingMeasures = (existing.meals || []).some((meal) =>
    (meal.items || []).some((item) => {
      const name = String(item.name || '')
      const display = String(item.display || '')
      return (display && !name)
        || (display && name && display === name)
        || (name && /\d+\s+(Unidade|Fatia|Colher|Xícara|Xicara)/i.test(name))
    }),
  ) && parsed.meals.some((meal) =>
    (meal.items || []).some((item) => item.display || item.grams || item.ml),
  )

  return existingMealCount < parsedMealCount
    || existingItemCount < parsedItemCount
    || missingMacros
    || missingMeasures
}

export function buildParsedMealPlanFromPrescription(prescription, patientName = null) {
  let meals = []

  if (prescription.methodology === 'qualitative') {
    syncQualitativeEditorContent(prescription)
    meals = parseQualitativeEditorText(prescription.editorText)
  } else {
    meals = (prescription.meals || []).map((meal) => ({
      id: meal.id,
      time: meal.time || '08:00',
      label: meal.label || 'Refeição',
      items: (meal.items || [])
        .filter((item) => item.name?.trim())
        .map((item) => {
          const display = item.display?.trim()
            || (prescription.methodology === 'equivalents'
              ? formatEquivalentDisplay(item)
              : formatFoodDisplay(item))
          const base = {
            key: item.id || crypto.randomUUID(),
            name: item.name.trim(),
            amount: item.amount ? Number(String(item.amount).replace(',', '.')) : null,
            unit: item.unit || (prescription.methodology === 'equivalents' ? formatPortionUnit(item.amount) : 'un'),
            grams: item.grams ?? null,
            ml: item.ml ?? null,
            display,
            substitutions: buildSubstitutionsForParsedPlan(item),
            foodId: item.foodId || null,
            foodSource: item.foodSource || null,
            linkedFoodName: item.linkedFoodName || null,
            per100g: item.per100g || null,
          }
          if (item.itemType === 'recipe' || item.recipeSnapshot || item.recipeId) {
            return {
              ...base,
              itemType: 'recipe',
              recipeId: item.recipeId || item.recipeSnapshot?.id || null,
              recipe: item.recipeSnapshot || null,
              display: item.recipeSnapshot?.title || base.display,
              name: item.recipeSnapshot?.title || base.name,
            }
          }
          return base
        }),
      macros: meal.macros || {
        proteinG: 0,
        fatG: 0,
        carbsG: 0,
        caloriesKcal: 0,
      },
    }))
  }

  const nutritionTotals = prescription.nutritionTotals || {
    caloriesKcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  }

  return {
    title: prescription.title?.trim() || 'Plano alimentar',
    patientName,
    prescribedAt: prescription.startDate || null,
    fileName: `${prescription.title || 'plano'}.prescricao`,
    meals,
    nutritionTotals,
    parserSource: prescription.nutritionTotals?.caloriesKcal ? 'dietbox' : 'ai',
  }
}

export function methodologyLabel(id) {
  return MEAL_PLAN_METHODOLOGIES.find((item) => item.id === id)?.label || 'Prescrição'
}

export function statusLabel(status) {
  if (status === 'draft') return 'Rascunho'
  if (status === 'active') return 'Ativo'
  if (status === 'archived') return 'Arquivado'
  return 'Rascunho'
}

export function previewPrescription(record) {
  if (String(record.finalNotes || '').includes('Importado automaticamente do PDF')) {
    const mealCount = record.meals?.length || 0
    const itemCount = (record.meals || []).reduce((sum, meal) => sum + (meal.items?.length || 0), 0)
    if (mealCount) {
      return `${mealCount} refeição(ões) do PDF · ${itemCount} alimento(s) montados`
    }
  }
  if (record.methodology === 'qualitative') {
    const preview = syncQualitativeEditorContent({
      methodology: 'qualitative',
      editorHtml: record.editorHtml,
      editorText: record.editorText,
    })
    const text = String(preview.editorText || '').trim()
    if (!text) return 'Editor vazio — comece a prescrever.'
    return text.length > 140 ? `${text.slice(0, 140)}…` : text
  }
  const mealCount = record.meals?.length || 0
  const itemCount = (record.meals || []).reduce((sum, meal) => sum + (meal.items?.length || 0), 0)
  if (!mealCount) return 'Nenhuma refeição cadastrada.'
  const kind = record.methodology === 'equivalents' ? 'equivalente(s)' : 'alimento(s)'
  return `${mealCount} refeição(ões) · ${itemCount} ${kind}`
}

export function collectRestrictions(profile, user) {
  const fromProfile = user?.patientProfileData?.anamneses || profile?.anamneses
  const list = Array.isArray(fromProfile) ? fromProfile : []
  const latest = [...list].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0]
  const restrictions = latest?.foodRestrictions || latest?.formData?.foodRestrictions
  return String(restrictions || '').trim()
}
