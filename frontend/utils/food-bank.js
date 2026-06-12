export function mapFoodItemFromApi(item) {
  if (!item) return null
  return {
    id: item.id,
    source: item.source,
    sourceCode: item.sourceCode,
    name: item.name,
    category: item.category,
    per100g: item.per100g || {
      caloriesKcal: item.caloriesKcal,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      fiberG: item.fiberG,
      sodiumMg: item.sodiumMg,
    },
    nutrients: item.nutrients,
  }
}

export function macrosForFoodRecord(food, grams) {
  const per100g = food?.per100g || {}
  const g = Math.max(1, Math.round(Number(grams) || 100))
  const ratio = g / 100
  return {
    caloriesKcal: Math.max(0, Math.round((per100g.caloriesKcal || 0) * ratio)),
    carbsG: roundMacro((per100g.carbsG || 0) * ratio),
    proteinG: roundMacro((per100g.proteinG || 0) * ratio),
    fatG: roundMacro((per100g.fatG || 0) * ratio),
  }
}

function roundMacro(value) {
  return Math.round(Number(value) * 10) / 10
}
