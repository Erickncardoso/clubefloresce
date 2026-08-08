function macroPercentsFromTotals(totals = {}) {
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

export function mealMacroPercents(macros = {}) {
  return macroPercentsFromTotals(macros)
}

export function buildMealMacroSummary(macros = {}) {
  const percents = mealMacroPercents(macros)
  return {
    macros,
    percents,
    chips: [
      { id: 'carbs', key: 'carbsG', label: 'CHO', tone: 'c', percent: percents.carbs },
      { id: 'protein', key: 'proteinG', label: 'PTN', tone: 'p', percent: percents.protein },
      { id: 'fat', key: 'fatG', label: 'LIP', tone: 'f', percent: percents.fat },
    ],
  }
}

export function hasLiveMealMacros(macros = {}) {
  return Boolean(
    (Number(macros.caloriesKcal) || 0) > 0
    || (Number(macros.carbsG) || 0) > 0
    || (Number(macros.proteinG) || 0) > 0
    || (Number(macros.fatG) || 0) > 0,
  )
}
