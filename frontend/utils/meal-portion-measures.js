/** Medidas caseiras para edição de porção no diário. */
export const PORTION_MEASURES = [
  { id: 'unidade', label: 'Unidade(s)', defaultGrams: 100 },
  { id: 'colher', label: 'Colher de sopa', defaultGrams: 15 },
  { id: 'fatia', label: 'Fatia(s)', defaultGrams: 30 },
  { id: 'xicara', label: 'Xícara(s)', defaultGrams: 160 },
  { id: 'porcao', label: 'Porção(ões)', defaultGrams: 100 },
]

/** Gramas médias por unidade para alimentos comuns (referência TACO / porções típicas). */
const FOOD_UNIT_GRAMS = [
  { pattern: /kiwi/i, grams: 80 },
  { pattern: /maçã|maca\b/i, grams: 130 },
  { pattern: /banana/i, grams: 90 },
  { pattern: /laranja/i, grams: 180 },
  { pattern: /mamão|mamao/i, grams: 140 },
  { pattern: /abacate/i, grams: 120 },
  { pattern: /ovo/i, grams: 50 },
  { pattern: /pão|pao\b/i, grams: 25 },
  { pattern: /biscoito/i, grams: 10 },
  { pattern: /tomate/i, grams: 120 },
  { pattern: /batata\b/i, grams: 150 },
  { pattern: /cenoura/i, grams: 80 },
  { pattern: /pepino/i, grams: 100 },
  { pattern: /limão|limao/i, grams: 60 },
  { pattern: /pera/i, grams: 130 },
  { pattern: /manga/i, grams: 200 },
  { pattern: /uva/i, grams: 5 },
  { pattern: /morango/i, grams: 12 },
  { pattern: /frango.*filé|file.*frango|peito.*frango/i, grams: 120 },
  { pattern: /hamb[uú]rguer/i, grams: 90 },
  { pattern: /salsicha/i, grams: 50 },
  { pattern: /queijo.*fatia|fatia.*queijo/i, grams: 25 },
]

const RECIPE_PATTERN =
  /bolo|lasanha|strogonoff|pizza|sandu[ií]che|torta|moqueca|risoto|panqueca|sopa|caldo|salada completa|prato feito|receita|mistura|guarni[cç][aã]o completa|escondidinho|nhoque|macarrão ao molho|macarrao ao molho|feijoada|virado/i

export function looksLikeRecipe(name) {
  return RECIPE_PATTERN.test(String(name || ''))
}

export function guessGramsPerUnit(foodName, measureId = 'unidade') {
  const name = String(foodName || '').toLowerCase()
  if (measureId === 'unidade') {
    for (const entry of FOOD_UNIT_GRAMS) {
      if (entry.pattern.test(name)) return entry.grams
    }
  }
  const measure = PORTION_MEASURES.find((m) => m.id === measureId)
  return measure?.defaultGrams || 100
}

export function amountToGrams(amount, measureId, foodName) {
  const qty = Math.max(0.1, Number(amount) || 1)
  const gramsPerUnit = guessGramsPerUnit(foodName, measureId)
  return Math.max(1, Math.round(qty * gramsPerUnit))
}

export function gramsToAmount(grams, measureId, foodName) {
  const gramsPerUnit = guessGramsPerUnit(foodName, measureId)
  const safeGrams = Math.max(1, Number(grams) || 1)
  return Math.round((safeGrams / gramsPerUnit) * 10) / 10
}

export function formatMeasureHint(foodName, measureId, gramsPerUnit) {
  const measure = PORTION_MEASURES.find((m) => m.id === measureId)
  const label = measure?.label || 'Unidade(s)'
  const gpu = gramsPerUnit || guessGramsPerUnit(foodName, measureId)
  return `1 ${label.toLowerCase().replace(/\(s\)/, '')} ≈ ${gpu} g`
}

export function createPortionState(item, overrides = {}) {
  const measureId = overrides.portionMeasure || 'unidade'
  const grams = Math.max(1, Math.round(Number(item?.grams) || 100))
  const gramsPerUnit = guessGramsPerUnit(item?.name, measureId)

  return {
    portionMode: overrides.portionMode || 'grams',
    portionMeasure: measureId,
    portionAmount: gramsToAmount(grams, measureId, item?.name),
    gramsPerUnit,
  }
}
