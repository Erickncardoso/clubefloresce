import { MEAL_PLAN_NUTRIENT_DRI, MEAL_PLAN_NUTRIENT_DETAIL_SECTIONS } from '~/config/meal-plan-nutrition-dri.js'
import { formatMacroGrams, formatMacroKcal, resolvedMealMacros } from '~/utils/meal-plan-prescription.js'

function roundNutrient(value) {
  if (value == null || Number.isNaN(Number(value))) return null
  const num = Number(value)
  if (Math.abs(num) >= 100) return Math.round(num * 10) / 10
  if (Math.abs(num) >= 10) return Math.round(num * 10) / 10
  return Math.round(num * 100) / 100
}

function itemGrams(item) {
  const grams = Number(item?.grams)
  if (Number.isFinite(grams) && grams > 0) return grams
  return 100
}

export function nutrientsPer100gFromItem(item) {
  const fromStored = item?.nutrientsPer100g
  if (fromStored && typeof fromStored === 'object') return fromStored

  const per100g = item?.per100g
  if (!per100g) return null

  return {
    energyKcal: per100g.caloriesKcal ?? null,
    proteinG: per100g.proteinG ?? null,
    carbsAvailableG: per100g.carbsG ?? null,
    fatG: per100g.fatG ?? null,
    fiberG: per100g.fiberG ?? null,
    sodiumMg: per100g.sodiumMg ?? null,
  }
}

export function scaleNutrientsPer100g(nutrientsPer100g, grams) {
  if (!nutrientsPer100g) return {}
  const ratio = Math.max(1, Number(grams) || 100) / 100
  const scaled = {}
  for (const [key, value] of Object.entries(nutrientsPer100g)) {
    if (typeof value !== 'number' || Number.isNaN(value)) continue
    scaled[key] = roundNutrient(value * ratio)
  }
  return scaled
}

export function sumPlanNutrients(meals) {
  const totals = {}
  for (const meal of meals || []) {
    for (const item of meal?.items || []) {
      const nutrientsPer100g = nutrientsPer100gFromItem(item)
      if (!nutrientsPer100g) continue
      const scaled = scaleNutrientsPer100g(nutrientsPer100g, itemGrams(item))
      for (const [key, value] of Object.entries(scaled)) {
        if (value == null) continue
        totals[key] = roundNutrient((totals[key] || 0) + value)
      }
    }
  }
  return totals
}

export function liveMacroTotalsFromMeals(meals, fallbackTotals = null) {
  const totals = { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  for (const meal of meals || []) {
    const macros = resolvedMealMacros(meal)
    totals.caloriesKcal += macros.caloriesKcal || 0
    totals.proteinG += macros.proteinG || 0
    totals.carbsG += macros.carbsG || 0
    totals.fatG += macros.fatG || 0
  }
  if (!totals.caloriesKcal && fallbackTotals?.caloriesKcal) {
    return {
      caloriesKcal: Math.round(fallbackTotals.caloriesKcal || 0),
      proteinG: roundNutrient(fallbackTotals.proteinG),
      carbsG: roundNutrient(fallbackTotals.carbsG),
      fatG: roundNutrient(fallbackTotals.fatG),
    }
  }
  return {
    caloriesKcal: Math.round(totals.caloriesKcal),
    proteinG: roundNutrient(totals.proteinG),
    carbsG: roundNutrient(totals.carbsG),
    fatG: roundNutrient(totals.fatG),
  }
}

export function macroPercentsFromTotals(totals) {
  const cK = (totals.carbsG || 0) * 4
  const pK = (totals.proteinG || 0) * 4
  const fK = (totals.fatG || 0) * 9
  const total = cK + pK + fK
  if (!total) return { carbs: 0, protein: 0, fat: 0 }
  return {
    carbs: Math.round((cK / total) * 100),
    protein: Math.round((pK / total) * 100),
    fat: Math.round((fK / total) * 100),
  }
}

export function macroRingStyleFromPercents({ carbs, protein, fat }) {
  const total = (carbs || 0) + (protein || 0) + (fat || 0)
  if (!total) {
    return { background: '#eef1ee' }
  }
  const cEnd = carbs
  const pEnd = cEnd + protein
  return {
    background: `conic-gradient(#3b82f6 0 ${cEnd}%, #ef4444 ${cEnd}% ${pEnd}%, #eab308 ${pEnd}% 100%)`,
  }
}

function formatNutrientValue(value, unit) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const num = Number(value)
  if (unit === 'Kcal') return `${Math.round(num)} Kcal`
  if (unit === 'mg') return `${formatNumber(num)} mg`
  if (unit === 'mcg') return `${formatNumber(num)} µg`
  if (unit === 'g') return formatMacroGrams(num)
  return formatNumber(num)
}

function formatNumber(value) {
  const num = Number(value)
  if (Number.isInteger(num)) return String(num)
  return num.toFixed(1).replace(/\.0$/, '')
}

function sharePercent(part, whole) {
  if (!part || !whole) return null
  return `${Math.round((part / whole) * 100)}%`
}

function driPercent(key, value) {
  const dri = MEAL_PLAN_NUTRIENT_DRI[key]
  if (dri == null || value == null || Number.isNaN(Number(value))) return null
  if (dri <= 0) return null
  return Math.round((Number(value) / dri) * 100)
}

function driBarMeta(dri) {
  if (dri == null) {
    return { barTone: 'neutral', barWidthPct: 0, pctLabel: 'N/D' }
  }
  let barTone = 'ok'
  if (dri < 80) barTone = 'low'
  else if (dri > 120) barTone = 'high'
  return {
    barTone,
    barWidthPct: Math.min(100, Math.max(0, dri)),
    pctLabel: `${dri}% DRI`,
  }
}

export function computeNutrientDriMeta(value, driReference) {
  if (driReference == null || value == null || Number.isNaN(Number(value))) {
    return driBarMeta(null)
  }
  if (driReference <= 0) return driBarMeta(null)
  const dri = Math.round((Number(value) / Number(driReference)) * 100)
  return driBarMeta(dri)
}

export function formatNutrientDisplay(value, unit) {
  return formatNutrientValue(value, unit)
}

export function buildNutrientFoodBreakdown(meals, nutrientKey) {
  const entries = []

  for (const meal of meals || []) {
    for (const item of meal?.items || []) {
      const name = String(item.name || '').trim()
      if (!name) continue

      const nutrientsPer100g = nutrientsPer100gFromItem(item)
      if (!nutrientsPer100g) continue

      const scaled = scaleNutrientsPer100g(nutrientsPer100g, itemGrams(item))
      const amount = scaled[nutrientKey]
      if (amount == null || Number(amount) <= 0) continue

      entries.push({
        id: `${meal.id}-${item.id}`,
        name,
        amount: roundNutrient(amount),
      })
    }
  }

  entries.sort((a, b) => (b.amount || 0) - (a.amount || 0))
  const total = entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)

  return entries.map((entry) => ({
    ...entry,
    sharePct: total ? Math.round((entry.amount / total) * 100) : 0,
  }))
}

export function buildMealPlanNutritionDonut(source = {}) {
  let percents = source
  if (source?.carbsG != null || source?.caloriesKcal != null) {
    percents = macroPercentsFromTotals(source)
  } else if (source?.macros) {
    percents = macroPercentsFromTotals(source.macros)
  } else if (source?.carbsPct != null) {
    percents = {
      carbs: source.carbsPct,
      protein: source.proteinPct,
      fat: source.fatPct,
    }
  }

  const circumference = 2 * Math.PI * 46
  const total = (percents?.carbs || 0) + (percents?.protein || 0) + (percents?.fat || 0)
  if (!total) {
    return {
      circumference,
      carbs: 0,
      protein: 0,
      fat: 0,
      carbsOffset: 0,
      proteinOffset: 0,
      fatOffset: 0,
    }
  }

  const carbs = (circumference * (percents.carbs || 0)) / 100
  const protein = (circumference * (percents.protein || 0)) / 100
  const fat = (circumference * (percents.fat || 0)) / 100

  return {
    circumference,
    carbs,
    protein,
    fat,
    carbsOffset: 0,
    proteinOffset: -carbs,
    fatOffset: -(carbs + protein),
  }
}

function buildSidebarMacroBlock(id, label, tone, grams, kcal, details) {
  return { id, label, tone, grams, kcal, details }
}

export function buildMealPlanNutritionReport(meals, fallbackTotals = null) {
  const macros = liveMacroTotalsFromMeals(meals, fallbackTotals)
  const percents = macroPercentsFromTotals(macros)
  const ringStyle = macroRingStyleFromPercents(percents)
  const nutrients = sumPlanNutrients(meals)

  nutrients.energyKcal = nutrients.energyKcal ?? macros.caloriesKcal
  nutrients.proteinG = nutrients.proteinG ?? macros.proteinG
  nutrients.carbsAvailableG = nutrients.carbsAvailableG ?? macros.carbsG
  nutrients.fatG = nutrients.fatG ?? macros.fatG

  const carbsKcal = Math.round((macros.carbsG || 0) * 4)
  const proteinKcal = Math.round((macros.proteinG || 0) * 4)
  const fatKcal = Math.round((macros.fatG || 0) * 9)

  const sidebarBlocks = [
    buildSidebarMacroBlock('carbs', 'Carboidratos', 'c', macros.carbsG, carbsKcal, [
      { label: 'Disponíveis', value: formatMacroGrams(nutrients.carbsAvailableG ?? macros.carbsG), share: sharePercent(nutrients.carbsAvailableG ?? macros.carbsG, macros.carbsG) || '100%' },
      { label: 'Fibras', value: nutrients.fiberG ? formatMacroGrams(nutrients.fiberG) : '—', share: sharePercent(nutrients.fiberG, macros.carbsG) },
      { label: 'Açúcares Adicionados', value: nutrients.addedSugarsG ? formatMacroGrams(nutrients.addedSugarsG) : '—', share: sharePercent(nutrients.addedSugarsG, macros.carbsG) },
    ]),
    buildSidebarMacroBlock('protein', 'Proteínas', 'p', macros.proteinG, proteinKcal, [
      { label: 'Animais', value: nutrients.animalProteinG ? formatMacroGrams(nutrients.animalProteinG) : '—', share: sharePercent(nutrients.animalProteinG, macros.proteinG) },
      { label: 'Vegetais', value: nutrients.vegetableProteinG ? formatMacroGrams(nutrients.vegetableProteinG) : '—', share: sharePercent(nutrients.vegetableProteinG, macros.proteinG) },
      { label: 'Compostos', value: '—', share: null },
    ]),
    buildSidebarMacroBlock('fat', 'Lipídios', 'f', macros.fatG, fatKcal, [
      { label: 'Saturados', value: nutrients.saturatedFatG ? formatMacroGrams(nutrients.saturatedFatG) : '—', share: sharePercent(nutrients.saturatedFatG, macros.fatG) },
      { label: 'Polinsaturados', value: nutrients.polyunsaturatedFatG ? formatMacroGrams(nutrients.polyunsaturatedFatG) : '—', share: sharePercent(nutrients.polyunsaturatedFatG, macros.fatG) },
      { label: 'Monoinsaturados', value: nutrients.monounsaturatedFatG ? formatMacroGrams(nutrients.monounsaturatedFatG) : '—', share: sharePercent(nutrients.monounsaturatedFatG, macros.fatG) },
    ]),
  ]

  const legend = [
    { id: 'carbs', label: 'Carboidratos', percent: percents.carbs, tone: 'c' },
    { id: 'protein', label: 'Proteínas', percent: percents.protein, tone: 'p' },
    { id: 'fat', label: 'Lipídios', percent: percents.fat, tone: 'f' },
  ]

  const detailSections = MEAL_PLAN_NUTRIENT_DETAIL_SECTIONS.map((section) => ({
    ...section,
    rows: section.rows.map((row) => {
      const value = nutrients[row.key] ?? null
      const dri = driPercent(row.key, value)
      const bars = driBarMeta(dri)
      return {
        ...row,
        value,
        displayValue: formatNutrientValue(value, row.unit),
        driPercent: dri,
        driLabel: dri == null ? 'N/D' : `${dri}% DRI`,
        ...bars,
      }
    }),
  }))

  const calcium = nutrients.calciumMg
  const phosphorus = nutrients.phosphorusMg
  const ratio = calcium && phosphorus ? `${(calcium / phosphorus).toFixed(2)}:1` : null

  return {
    macros,
    percents,
    ringStyle,
    nutrients,
    sidebarBlocks,
    legend,
    detailSections,
    sections: detailSections,
    calciumPhosphorusRatio: ratio,
    kcalLabel: macros.caloriesKcal ? String(macros.caloriesKcal) : '—',
  }
}

export { MEAL_PLAN_NUTRIENT_DRI } from '~/config/meal-plan-nutrition-dri.js'
export { formatMacroKcal, formatMacroGrams }
