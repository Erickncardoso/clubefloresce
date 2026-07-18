import { createMealItemId } from './meal-diary.js'
import { normalizeMealPlanItem, resolveMealItemName } from './meal-plan-display-parse.js'
import { resolveItemGrams } from './meal-portion-measures.js'

/** Extrai gramas/ml explícitos de textos como "Mussarela (50g)", "30g whey", "200 ml leite". */
export function parseMeasureFromDisplay(text) {
  const raw = String(text || '').trim()
  if (!raw) return null

  const parensG = raw.match(/\(\s*(\d+(?:[.,]\d+)?)\s*g\s*\)/i)
  if (parensG) {
    return { grams: Math.round(Number(parensG[1].replace(',', '.'))) }
  }

  const parensMl = raw.match(/\(\s*(\d+(?:[.,]\d+)?)\s*ml\s*\)/i)
  if (parensMl) {
    return { ml: Math.round(Number(parensMl[1].replace(',', '.'))) }
  }

  const trailingG = raw.match(/(\d+(?:[.,]\d+)?)\s*g\s*$/i)
  if (trailingG) {
    return { grams: Math.round(Number(trailingG[1].replace(',', '.'))) }
  }

  const leadingG = raw.match(/^(\d+(?:[.,]\d+)?)\s*g\b/i)
  if (leadingG) {
    return { grams: Math.round(Number(leadingG[1].replace(',', '.'))) }
  }

  const trailingMl = raw.match(/(\d+(?:[.,]\d+)?)\s*ml\s*$/i)
  if (trailingMl) {
    return { ml: Math.round(Number(trailingMl[1].replace(',', '.'))) }
  }

  // Peso inline no meio do texto (ex.: "mussarela, 50 g, fatiada")
  const inlineMatches = [...raw.matchAll(/(\d+(?:[.,]\d+)?)\s*g\b/gi)]
  if (inlineMatches.length) {
    const last = inlineMatches[inlineMatches.length - 1]
    return { grams: Math.round(Number(last[1].replace(',', '.'))) }
  }

  return null
}

function displayTextsForGramResolve(item) {
  if (!item || typeof item !== 'object') return []
  const normalized = normalizeMealPlanItem(item)
  return [
    normalized.display,
    item.originalDisplay,
  ].filter(Boolean)
}

/** Gramas reais do item do plano — display do PDF tem prioridade sobre grams placeholder. */
export function resolvePlanItemGrams(item) {
  if (!item) return 0
  const normalized = normalizeMealPlanItem(item)
  if (normalized.unit === 'avontade') return 0

  // 1) (50g) / 30g no texto exibido — fonte de verdade do Dietbox
  for (const text of displayTextsForGramResolve(normalized)) {
    const fromText = parseMeasureFromDisplay(text)
    if (fromText?.grams > 0) return fromText.grams
    if (fromText?.ml > 0) return fromText.ml
  }

  // 2) Porção caseira (amount + unit) — desfaz placeholder 100g do parser
  const fromPortion = resolveItemGrams(normalized, { defaultGrams: 0 })
  if (fromPortion > 0) return Math.round(fromPortion)

  // 3) Gramas/ml explícitos já normalizados
  if (normalized.grams > 0) return Math.round(normalized.grams)
  if (normalized.ml > 0) return Math.round(normalized.ml)

  return 0
}

export function buildPlanDiaryItems(meal, checkedStates = []) {
  if (!meal?.items?.length) return []

  return meal.items
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => Boolean(checkedStates[index]))
    .map(({ item }) => {
      const normalized = normalizeMealPlanItem(item)
      const name = resolveMealItemName(normalized)
      if (!name) return null

      if (item.isExtra && item.foodId) {
        const grams = Math.max(1, Math.round(Number(item.grams) || 0))
        if (grams <= 0) return null

        return {
          id: item.id || createMealItemId(),
          name,
          grams,
          caloriesKcal: item.caloriesKcal || 0,
          carbsG: item.carbsG || 0,
          proteinG: item.proteinG || 0,
          fatG: item.fatG || 0,
          foodId: item.foodId,
          source: 'food_bank',
          originalName: name,
        }
      }

      const grams = resolvePlanItemGrams(normalized)
      if (grams <= 0) return null

      const foodId = normalized.foodId || null

      return {
        id: createMealItemId(),
        name,
        grams,
        caloriesKcal: 0,
        carbsG: 0,
        proteinG: 0,
        fatG: 0,
        foodId,
        source: foodId ? 'food_bank' : 'meal_plan',
        originalName: normalized.display || normalized.key || name,
      }
    })
    .filter(Boolean)
}
