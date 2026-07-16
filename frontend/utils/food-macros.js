import {
  atwaterEnergyGap,
  atwaterInputFromMacros,
  calculateAtwaterCalories,
  digestibleCarbsForAtwater,
  hasUsableMacrosForAtwater,
} from './atwater.js'

export function round1(value) {
  return Math.round(Number(value) * 10) / 10
}

function readFiberG(food) {
  const fromColumn = food?.per100g?.fiberG
  if (fromColumn != null && fromColumn >= 0) return fromColumn
  const fromNutrients = food?.nutrients?.per100g?.fiberG
  if (fromNutrients != null && fromNutrients >= 0) return fromNutrients
  return 0
}

function readAlcoholG(food) {
  const fromNutrients = food?.nutrients?.per100g?.alcoholG
  if (fromNutrients != null && fromNutrients >= 0) return fromNutrients
  return 0
}

function readCarbsG(food) {
  const nutrients = food?.nutrients?.per100g
  if (food?.source === 'TBCA') {
    const available = nutrients?.carbsAvailableG
    if (available != null && available >= 0) return available
    const total = nutrients?.carbsTotalG
    if (total != null && total >= 0) return total
  }
  const fromColumn = food?.per100g?.carbsG
  if (fromColumn != null && fromColumn >= 0) return fromColumn
  const fromNutrients = nutrients?.carbsG
  if (fromNutrients != null && fromNutrients >= 0) return fromNutrients
  return 0
}

function usesTableEnergy(food, declaredKcal) {
  const source = String(food?.source || '').toUpperCase()
  return (source === 'TACO' || source === 'TBCA') && declaredKcal > 0
}

function shouldTrustTableCalories({ food, declaredKcal, atwaterKcal }) {
  if (!usesTableEnergy(food, declaredKcal)) return false
  if (!atwaterKcal || atwaterKcal <= 0) return true
  const ratio = declaredKcal / Math.max(atwaterKcal, 1)
  if (declaredKcal >= 300 && ratio >= 3.2) return false
  if (declaredKcal >= 600 && ratio >= 2.4) return false
  return true
}

function reconcileMacrosWithCalories(caloriesKcal, carbsG, proteinG, fatG, fiberG, carbsDigestible) {
  let c = Math.max(0, carbsG)
  let p = Math.max(0, proteinG)
  let f = Math.max(0, fatG)

  if (caloriesKcal <= 0) return { carbsG: c, proteinG: p, fatG: f }

  const energyGap = (carbs, protein, fat) => atwaterEnergyGap(
    caloriesKcal,
    atwaterInputFromMacros({
      carbsG: carbsDigestible ? carbs : digestibleCarbsForAtwater(carbs, fiberG),
      proteinG: protein,
      fatG: fat,
      fiberG: carbsDigestible ? 0 : fiberG,
    }),
  )

  if (c > 100) c /= 10
  if (p > 55) p /= 10
  if (p > 20 && p * 4 > caloriesKcal * 0.95) p /= 10
  if (p >= 8 && p <= 50 && f > 8 && caloriesKcal < 400) {
    const fFixed = f / 10
    if (energyGap(c, p, fFixed) < energyGap(c, p, f)) f = fFixed
  }
  if (f > 50 && caloriesKcal < 500) f /= 10
  if (energyGap(c, p, f) > caloriesKcal * 0.85) {
    if (p * 4 > caloriesKcal * 0.7) p /= 10
    if (f * 9 > caloriesKcal * 0.55) f /= 10
    if (c > 45 && c * 4 > caloriesKcal * 0.95) c /= 10
  }

  return { carbsG: c, proteinG: p, fatG: f }
}

function resolveCaloriesKcal(declaredKcal, energyPolicy, atwaterInput) {
  if (energyPolicy === 'table') return Math.max(0, Math.round(declaredKcal))
  if (hasUsableMacrosForAtwater(atwaterInput)) return calculateAtwaterCalories(atwaterInput)
  return Math.max(0, Math.round(declaredKcal))
}

export function normalizePer100gMacros(food) {
  const nutrients = food?.nutrients?.per100g
  const energyFromNutrients = nutrients?.energyKcal != null ? Number(nutrients.energyKcal) : null
  const declaredKcal = food?.per100g?.caloriesKcal || energyFromNutrients || 0
  let carbsG = readCarbsG(food)
  let proteinG = food?.per100g?.proteinG ?? nutrients?.proteinG ?? 0
  let fatG = food?.per100g?.fatG ?? nutrients?.fatG ?? 0
  const fiberG = readFiberG(food)
  const carbsDigestible = food?.source === 'TBCA'
    && nutrients?.carbsAvailableG != null
    && nutrients.carbsAvailableG >= 0

  proteinG = proteinG || 0
  fatG = fatG || 0

  const reconciled = reconcileMacrosWithCalories(
    declaredKcal,
    carbsG,
    proteinG,
    fatG,
    fiberG,
    carbsDigestible,
  )
  const alcoholG = readAlcoholG(food)
  const atwaterInput = atwaterInputFromMacros({
    carbsG: reconciled.carbsG,
    proteinG: reconciled.proteinG,
    fatG: reconciled.fatG,
    fiberG: carbsDigestible ? 0 : fiberG,
    alcoholG,
  })
  const atwaterKcal = hasUsableMacrosForAtwater(atwaterInput)
    ? calculateAtwaterCalories(atwaterInput)
    : null
  const energyPolicy = shouldTrustTableCalories({ food, declaredKcal, atwaterKcal }) ? 'table' : 'atwater'
  const caloriesKcal = resolveCaloriesKcal(declaredKcal, energyPolicy, atwaterInput)

  return {
    caloriesKcal,
    carbsG: Math.max(0, round1(reconciled.carbsG)),
    proteinG: Math.max(0, round1(reconciled.proteinG)),
    fatG: Math.max(0, round1(reconciled.fatG)),
    fiberG: Math.max(0, round1(fiberG)),
    energyPolicy,
    carbsDigestible,
  }
}

export function macrosAtGramsFromPer100g(per100g, grams, alcoholGPer100g = 0) {
  const portion = Math.max(1, Math.round(Number(grams) || 100))
  const ratio = portion / 100
  const carbsG = round1(per100g.carbsG * ratio)
  const proteinG = round1(per100g.proteinG * ratio)
  const fatG = round1(per100g.fatG * ratio)
  const alcoholG = round1(alcoholGPer100g * ratio)

  let caloriesKcal
  if (per100g.energyPolicy === 'table' && per100g.caloriesKcal > 0) {
    caloriesKcal = Math.max(0, Math.round(per100g.caloriesKcal * ratio))
  } else {
    const digestibleCarbsG = per100g.carbsDigestible
      ? carbsG
      : round1(digestibleCarbsForAtwater(per100g.carbsG, per100g.fiberG ?? 0) * ratio)
    caloriesKcal = calculateAtwaterCalories({
      carbsG: digestibleCarbsG,
      proteinG,
      fatG,
      alcoholG,
    })
  }

  return {
    grams: portion,
    caloriesKcal,
    carbsG,
    proteinG,
    fatG,
  }
}

export function macrosForFoodAtGrams(food, grams) {
  const normalized = normalizePer100gMacros(food)
  return macrosAtGramsFromPer100g(normalized, grams, readAlcoholG(food))
}
