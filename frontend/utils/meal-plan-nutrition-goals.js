const KCAL_PER_G = {
  protein: 4,
  carbs: 4,
  fat: 9,
}

export function roundMacroGoal(value) {
  return Math.round(Number(value) * 10) / 10
}

export function gramsFromMacroPercents(caloriesKcal, percents = {}) {
  const kcal = Math.max(0, Number(caloriesKcal) || 0)
  if (!kcal) {
    return { proteinG: 0, carbsG: 0, fatG: 0, caloriesKcal: 0 }
  }
  const proteinPct = Math.max(0, Number(percents.proteinPct) || 0)
  const carbsPct = Math.max(0, Number(percents.carbsPct) || 0)
  const fatPct = Math.max(0, Number(percents.fatPct) || 0)
  return {
    caloriesKcal: Math.round(kcal),
    proteinG: roundMacroGoal((kcal * proteinPct / 100) / KCAL_PER_G.protein),
    carbsG: roundMacroGoal((kcal * carbsPct / 100) / KCAL_PER_G.carbs),
    fatG: roundMacroGoal((kcal * fatPct / 100) / KCAL_PER_G.fat),
  }
}

export function percentsFromMacroGrams(caloriesKcal, grams = {}) {
  const kcal = Math.max(0, Number(caloriesKcal) || 0)
  if (!kcal) {
    return { proteinPct: 0, carbsPct: 0, fatPct: 0 }
  }
  const proteinG = Math.max(0, Number(grams.proteinG) || 0)
  const carbsG = Math.max(0, Number(grams.carbsG) || 0)
  const fatG = Math.max(0, Number(grams.fatG) || 0)
  const proteinKcal = proteinG * KCAL_PER_G.protein
  const carbsKcal = carbsG * KCAL_PER_G.carbs
  const fatKcal = fatG * KCAL_PER_G.fat
  return {
    proteinPct: Math.round((proteinKcal / kcal) * 1000) / 10,
    carbsPct: Math.round((carbsKcal / kcal) * 1000) / 10,
    fatPct: Math.round((fatKcal / kcal) * 1000) / 10,
  }
}

export function gramsFromPerKg(weightKg, perKg = {}) {
  const weight = Math.max(0, Number(weightKg) || 0)
  if (!weight) {
    return { proteinG: 0, carbsG: 0, fatG: 0 }
  }
  return {
    proteinG: roundMacroGoal((Number(perKg.proteinGPerKg) || 0) * weight),
    carbsG: roundMacroGoal((Number(perKg.carbsGPerKg) || 0) * weight),
    fatG: roundMacroGoal((Number(perKg.fatGPerKg) || 0) * weight),
  }
}

export function perKgFromMacroGrams(weightKg, grams = {}) {
  const weight = Math.max(0, Number(weightKg) || 0)
  if (!weight) {
    return { proteinGPerKg: 0, carbsGPerKg: 0, fatGPerKg: 0 }
  }
  return {
    proteinGPerKg: roundMacroGoal((Number(grams.proteinG) || 0) / weight),
    carbsGPerKg: roundMacroGoal((Number(grams.carbsG) || 0) / weight),
    fatGPerKg: roundMacroGoal((Number(grams.fatG) || 0) / weight),
  }
}

export function macroPercentTotal(percents = {}) {
  return roundMacroGoal(
    (Number(percents.proteinPct) || 0)
    + (Number(percents.carbsPct) || 0)
    + (Number(percents.fatPct) || 0),
  )
}

export function caloriesFromMacroGrams(grams = {}) {
  const proteinG = Math.max(0, Number(grams.proteinG) || 0)
  const carbsG = Math.max(0, Number(grams.carbsG) || 0)
  const fatG = Math.max(0, Number(grams.fatG) || 0)
  return Math.round(
    proteinG * KCAL_PER_G.protein
    + carbsG * KCAL_PER_G.carbs
    + fatG * KCAL_PER_G.fat,
  )
}

export function hydrateMacroGoalsDraft(goals, { weightKg = null } = {}) {
  const block = goals && typeof goals === 'object' ? goals : {}
  const goalType = block.goalType || 'general'
  const includeCalories = block.includeCalories !== false
  const caloriesKcal = includeCalories
    ? Math.round(Number(block.caloriesKcal) || 0)
    : caloriesFromMacroGrams(block)
  const grams = {
    proteinG: block.proteinG ?? 0,
    carbsG: block.carbsG ?? 0,
    fatG: block.fatG ?? 0,
  }
  const percents = block.proteinPct != null
    ? {
        proteinPct: block.proteinPct,
        carbsPct: block.carbsPct,
        fatPct: block.fatPct,
      }
    : percentsFromMacroGrams(caloriesKcal, grams)
  const perKg = block.proteinGPerKg != null
    ? {
        proteinGPerKg: block.proteinGPerKg,
        carbsGPerKg: block.carbsGPerKg,
        fatGPerKg: block.fatGPerKg,
      }
    : perKgFromMacroGrams(weightKg, grams)

  return {
    goalType,
    includeCalories,
    caloriesKcal: caloriesKcal || '',
    proteinG: grams.proteinG ?? '',
    carbsG: grams.carbsG ?? '',
    fatG: grams.fatG ?? '',
    proteinPct: percents.proteinPct ?? '',
    carbsPct: percents.carbsPct ?? '',
    fatPct: percents.fatPct ?? '',
    proteinGPerKg: perKg.proteinGPerKg ?? '',
    carbsGPerKg: perKg.carbsGPerKg ?? '',
    fatGPerKg: perKg.fatGPerKg ?? '',
  }
}

export function normalizeMacroGoalsForSave(draft, { weightKg = null } = {}) {
  const goalType = draft.goalType || 'general'
  const includeCalories = draft.includeCalories !== false
  let proteinG = 0
  let carbsG = 0
  let fatG = 0
  let caloriesKcal = 0
  let proteinPct = null
  let carbsPct = null
  let fatPct = null
  let proteinGPerKg = null
  let carbsGPerKg = null
  let fatGPerKg = null

  if (goalType === 'percent') {
    caloriesKcal = Math.round(Number(draft.caloriesKcal) || 0)
    proteinPct = roundMacroGoal(Number(draft.proteinPct) || 0)
    carbsPct = roundMacroGoal(Number(draft.carbsPct) || 0)
    fatPct = roundMacroGoal(Number(draft.fatPct) || 0)
    const fromPct = gramsFromMacroPercents(caloriesKcal, { proteinPct, carbsPct, fatPct })
    proteinG = fromPct.proteinG
    carbsG = fromPct.carbsG
    fatG = fromPct.fatG
  } else if (goalType === 'per_kg') {
    proteinGPerKg = roundMacroGoal(Number(draft.proteinGPerKg) || 0)
    carbsGPerKg = roundMacroGoal(Number(draft.carbsGPerKg) || 0)
    fatGPerKg = roundMacroGoal(Number(draft.fatGPerKg) || 0)
    const fromKg = gramsFromPerKg(weightKg, { proteinGPerKg, carbsGPerKg, fatGPerKg })
    proteinG = fromKg.proteinG
    carbsG = fromKg.carbsG
    fatG = fromKg.fatG
    caloriesKcal = caloriesFromMacroGrams({ proteinG, carbsG, fatG })
  } else {
    proteinG = roundMacroGoal(Number(draft.proteinG) || 0)
    carbsG = roundMacroGoal(Number(draft.carbsG) || 0)
    fatG = roundMacroGoal(Number(draft.fatG) || 0)
    caloriesKcal = includeCalories
      ? Math.round(Number(draft.caloriesKcal) || 0)
      : caloriesFromMacroGrams({ proteinG, carbsG, fatG })
    const pct = percentsFromMacroGrams(caloriesKcal || caloriesFromMacroGrams({ proteinG, carbsG, fatG }), {
      proteinG,
      carbsG,
      fatG,
    })
    proteinPct = pct.proteinPct
    carbsPct = pct.carbsPct
    fatPct = pct.fatPct
  }

  return {
    goalType,
    includeCalories: goalType === 'general' ? includeCalories : true,
    caloriesKcal: goalType === 'general' && !includeCalories ? 0 : caloriesKcal,
    proteinG,
    carbsG,
    fatG,
    proteinPct,
    carbsPct,
    fatPct,
    proteinGPerKg,
    carbsGPerKg,
    fatGPerKg,
    patientWeightKg: weightKg != null ? roundMacroGoal(weightKg) : null,
  }
}

export function macroGoalTypeLabel(goalType) {
  if (goalType === 'percent') return 'Percentual do VET'
  if (goalType === 'per_kg') return 'Gramas por kg'
  return 'Gramas absolutos'
}
