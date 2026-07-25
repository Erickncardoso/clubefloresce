import { mealMacroPercents } from './meal-plan-live-macros.js'
import { formatMacroGrams, formatMacroKcal } from './meal-plan-prescription.js'

export function enrichMealNutritionRows(mealRows = []) {
  return mealRows.map((row) => {
    const macros = {
      caloriesKcal: row.caloriesKcal || 0,
      carbsG: row.carbsG || 0,
      proteinG: row.proteinG || 0,
      fatG: row.fatG || 0,
    }
    const percents = mealMacroPercents(macros)
    return {
      ...row,
      macros,
      percents,
      caloriesLabel: formatMacroKcal(macros.caloriesKcal),
      carbsLabel: formatMacroGrams(macros.carbsG),
      proteinLabel: formatMacroGrams(macros.proteinG),
      fatLabel: formatMacroGrams(macros.fatG),
      carbsPctLabel: `${percents.carbs}%`,
      proteinPctLabel: `${percents.protein}%`,
      fatPctLabel: `${percents.fat}%`,
    }
  })
}

export function buildNutritionSummaryLegend(macros = {}, percents = null) {
  const pct = percents || mealMacroPercents(macros)
  return [
    {
      id: 'carbs',
      label: 'Carboidratos',
      tone: 'c',
      grams: formatMacroGrams(macros.carbsG),
      percent: pct.carbs,
    },
    {
      id: 'protein',
      label: 'Proteínas',
      tone: 'p',
      grams: formatMacroGrams(macros.proteinG),
      percent: pct.protein,
    },
    {
      id: 'fat',
      label: 'Lipídios',
      tone: 'f',
      grams: formatMacroGrams(macros.fatG),
      percent: pct.fat,
    },
  ]
}

export function buildNutritionSummaryDocumentModel({
  printContext = {},
  macros = {},
  percents = null,
  mealRows = [],
} = {}) {
  const resolvedPercents = percents || mealMacroPercents(macros)
  return {
    printContext,
    macros,
    percents: resolvedPercents,
    kcalLabel: formatMacroKcal(macros.caloriesKcal),
    legend: buildNutritionSummaryLegend(macros, resolvedPercents),
    meals: enrichMealNutritionRows(mealRows),
  }
}

export function nutritionSummaryPdfFilename(printContext = {}) {
  const slug = String(printContext.planTitle || 'resumo-nutricional')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .toLowerCase()
  return `${slug || 'resumo-nutricional'}.pdf`
}
