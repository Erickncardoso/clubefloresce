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
  { pattern: /banana|nanica|caturra|prata/i, grams: 90 },
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

export function parsePortionAmount(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const normalized = raw
    .replace(',', '.')
    .replace('½', '0.5')
    .replace('¼', '0.25')
    .replace('¾', '0.75')
  const num = Number(normalized)
  if (Number.isFinite(num) && num > 0) return num
  return null
}

export function parseMeasureFromUnit(unit) {
  const raw = String(unit || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!raw) return null
  if (raw === 'g' || raw === 'gr' || raw.startsWith('grama')) return 'grams'
  if (/^ml\b|mililitro/.test(raw)) return 'ml'
  if (/porcao media|porção média/.test(raw)) return 'porcao_media'
  if (/colher|sopa|\bcs\b/.test(raw)) return 'colher'
  if (/fatia/.test(raw)) return 'fatia'
  if (/xicara|xícara/.test(raw)) return 'xicara'
  if (/porcao|porção|\bpor\b/.test(raw)) return 'porcao'
  if (/unidade|unidades|\bun\b|\bun\.|\bund\b/.test(raw)) return 'unidade'
  return 'unidade'
}

export function resolveItemGrams(item, { defaultGrams = 100 } = {}) {
  if (!item || typeof item !== 'object') return defaultGrams

  const name = String(item.name || item.display || '').trim()
  const portionAmount = parsePortionAmount(item.portionAmount)
  const portionMeasure = String(item.portionMeasure || '').trim()
  const amount = parsePortionAmount(item.amount)
  const measureFromUnit = item.unit ? parseMeasureFromUnit(item.unit) : null

  // Medida em gramas: quantidade informada já é o peso.
  if (portionMeasure === 'grams' && portionAmount != null) {
    return Math.max(1, Math.round(portionAmount))
  }
  if (measureFromUnit === 'grams' && amount != null) {
    return Math.max(1, Math.round(amount))
  }
  const unitText = String(item.unit || '')
  const gramsInUnit = unitText.match(/\(\s*(\d+(?:[.,]\d+)?)\s*g\s*\)/i)
  if (gramsInUnit) {
    return Math.max(1, Math.round(Number(gramsInUnit[1].replace(',', '.'))))
  }

  // Porção caseira tem prioridade sobre grams “placeholder” (ex.: default 100 g com 1 unidade).
  if (portionAmount != null && portionMeasure && portionMeasure !== 'grams') {
    return amountToGrams(portionAmount, portionMeasure, name)
  }
  if (amount != null && measureFromUnit && measureFromUnit !== 'grams' && measureFromUnit !== 'ml') {
    return amountToGrams(amount, measureFromUnit, name)
  }
  if (amount != null && measureFromUnit === 'ml') {
    return Math.max(1, Math.round(amount))
  }

  const explicitGrams = Number(item.grams)
  if (Number.isFinite(explicitGrams) && explicitGrams > 0) {
    return Math.max(1, Math.round(explicitGrams))
  }

  if (amount != null && measureFromUnit === 'grams') {
    return Math.max(1, Math.round(amount))
  }

  return defaultGrams
}

export function syncItemPortionGrams(item, options) {
  const grams = resolveItemGrams(item, options)
  if (item && typeof item === 'object') item.grams = grams
  return grams
}

export function amountToGrams(amount, measureId, foodName) {
  const qty = Math.max(0.1, Number(amount) || 1)
  if (measureId === 'grams') {
    return Math.max(1, Math.round(qty))
  }
  if (measureId === 'porcao_media') {
    return Math.max(1, Math.round(qty * 100))
  }
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
