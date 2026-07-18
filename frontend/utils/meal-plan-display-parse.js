/**
 * Parser de linha Dietbox — espelha backend/src/services/meal-plan/dietbox-parser.ts
 * O campo display do PDF é a fonte de verdade (nome, unidade, g/ml).
 */

function normalizeFractions(value) {
  return String(value || '')
    .replace(/½/g, '0.5')
    .replace(/¼/g, '0.25')
    .replace(/¾/g, '0.75')
}

export function parseQuantityTail(body) {
  const normalized = normalizeFractions(String(body || '').trim())

  if (/à vontade/i.test(normalized)) {
    const name = normalized.replace(/\s*à vontade.*$/i, '').replace(/\s+\d+.*$/, '').trim()
    return { name: name || normalized, amount: null, unit: 'avontade' }
  }

  const qtyMatch = normalized.match(
    /^(.*?)\s+(\d+(?:\.\d+)?)\s+(Unidade\(s\)|unidades?|fatia\(s\)|Fatia\(s\)|Colher\(es\)|colheres?|colher|Medidor\(es\)|Porção\(ões\)|Prato\(s\)|Filé\(s\)|Xícara\(s\)|Xicara\(s\)|Medida\(s\)|Dosador\(es\)|Concha\(s\)|Copo\(s\))(?:\s+.+)?$/i,
  )

  if (qtyMatch) {
    const unitRaw = qtyMatch[3].toLowerCase()
    let unit = 'unidade'
    if (unitRaw.includes('fatia')) unit = 'fatia'
    else if (unitRaw.includes('colher') || unitRaw.includes('medidor')) unit = 'colher'
    else if (unitRaw.includes('xícara') || unitRaw.includes('xicara')) unit = 'xicara'
    else if (unitRaw.includes('prato') || unitRaw.includes('porção') || unitRaw.includes('porcao')) unit = 'porcao'
    else if (unitRaw.includes('filé') || unitRaw.includes('file')) unit = 'file'
    else if (unitRaw.includes('dosador')) unit = 'dosador'
    else if (unitRaw.includes('concha')) unit = 'concha'
    else if (unitRaw.includes('copo')) unit = 'copo'

    return {
      name: qtyMatch[1].trim(),
      amount: Number(qtyMatch[2]),
      unit,
    }
  }

  return { name: normalized, amount: null, unit: 'porcao' }
}

/** Parseia linha completa do PDF Dietbox. Retorna null se não reconhecer o formato. */
export function parseDietboxItemLine(raw) {
  const text = normalizeFractions(String(raw || '').replace(/\s+/g, ' ').trim())
  if (!text) return null

  if (/à vontade/i.test(text) && !/\(\d+(?:\.\d+)?\s*(g|ml)\)\s*$/i.test(text) && !/\d+(?:\.\d+)?\s*(g|ml)\s*$/i.test(text)) {
    const name = text.replace(/\s*-\s*.*à vontade.*$/i, '').replace(/\s+à vontade.*$/i, '').trim()
    return {
      name: name || text,
      amount: null,
      unit: 'avontade',
      grams: null,
      ml: null,
      display: text,
    }
  }

  const parensMatch = text.match(/^(.*)\((\d+(?:\.\d+)?)\s*(g|ml)\)\s*$/i)
  if (parensMatch) {
    const body = parensMatch[1].trim()
    const measure = Number(parensMatch[2])
    const measureUnit = parensMatch[3].toLowerCase()
    const { name, amount, unit } = parseQuantityTail(body)
    return {
      name,
      amount,
      unit,
      grams: measureUnit === 'g' ? measure : null,
      ml: measureUnit === 'ml' ? measure : null,
      display: text,
    }
  }

  const plainMatch = text.match(/^(.*)(\d+(?:\.\d+)?)\s*(g|ml)\s*$/i)
  if (plainMatch) {
    const body = plainMatch[1].trim()
    const measure = Number(plainMatch[2])
    const measureUnit = plainMatch[3].toLowerCase()
    const { name, amount, unit } = parseQuantityTail(body)
    return {
      name,
      amount,
      unit,
      grams: measureUnit === 'g' ? measure : null,
      ml: measureUnit === 'ml' ? measure : null,
      display: text,
    }
  }

  const leadingMatch = text.match(/^(\d+(?:\.\d+)?)\s*(g|ml)\s+(?:de\s+)?(.+)$/i)
  if (leadingMatch) {
    const measure = Number(leadingMatch[1])
    const measureUnit = leadingMatch[2].toLowerCase()
    const name = leadingMatch[3].trim()
    return {
      name,
      amount: null,
      unit: measureUnit === 'g' ? 'g' : 'ml',
      grams: measureUnit === 'g' ? measure : null,
      ml: measureUnit === 'ml' ? measure : null,
      display: text,
    }
  }

  return null
}

/** Normaliza item do plano usando display do PDF como fonte de verdade. */
export function normalizeMealPlanItem(item) {
  if (!item || typeof item !== 'object') return item

  const displaySource = String(item.display || item.originalDisplay || '').trim()
  const parsed = displaySource ? parseDietboxItemLine(displaySource) : null

  if (parsed?.name) {
    return {
      ...item,
      food: parsed.name,
      name: parsed.name,
      amount: parsed.amount ?? item.amount ?? null,
      unit: parsed.unit ?? item.unit ?? '',
      grams: parsed.grams ?? item.grams ?? null,
      ml: parsed.ml ?? item.ml ?? null,
      display: parsed.display,
    }
  }

  return item
}

/** Texto exibido na dieta — nunca mostra name corrompido se display existir. */
export function resolveMealItemDisplay(item) {
  if (!item) return ''
  if (typeof item === 'string') return item

  const normalized = normalizeMealPlanItem(item)
  if (normalized.display) return normalized.display

  return ''
}

/** Nome limpo para check/calorias/busca TBCA. */
export function resolveMealItemName(item) {
  const normalized = normalizeMealPlanItem(item)
  return String(normalized.name || normalized.food || '').trim()
}
