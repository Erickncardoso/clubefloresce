import { createMealItemId } from './meal-diary.js'
import { formatMealItemLabel } from './meal-plan-format.js'
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
  const texts = [
    item.display,
    item.originalDisplay,
    item.name,
    typeof item.food === 'string' ? item.food : null,
  ]
  try {
    texts.push(formatMealItemLabel(item))
  } catch {
    /* ignore */
  }
  return texts.filter(Boolean)
}

/** Gramas reais do item do plano — nunca assume 100g por padrão. */
export function resolvePlanItemGrams(item) {
  if (!item) return 0
  if (item.unit === 'avontade') return 0

  // Peso no texto exibido (PDF ou label formatado) tem prioridade sobre grams placeholder.
  for (const text of displayTextsForGramResolve(item)) {
    const fromText = parseMeasureFromDisplay(text)
    if (fromText?.grams > 0) return fromText.grams
    if (fromText?.ml > 0) return fromText.ml
  }

  // Mesma lógica do editor: amount+unit antes de grams placeholder (100g default).
  const resolved = resolveItemGrams(item, { defaultGrams: 0 })
  return resolved > 0 ? Math.round(resolved) : 0
}

export function buildPlanDiaryItems(meal, checkedStates = []) {
  if (!meal?.items?.length) return []

  return meal.items
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => Boolean(checkedStates[index]))
    .map(({ item }) => {
      const name = String(item.name || item.food || '').trim()
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

      const grams = resolvePlanItemGrams(item)
      if (grams <= 0) return null

      const foodId = item.foodId || null

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
        originalName: item.key || item.display || name,
      }
    })
    .filter(Boolean)
}
