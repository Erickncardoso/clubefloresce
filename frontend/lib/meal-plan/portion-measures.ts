/** Medidas caseiras para edição de porção — port do utilitário Vue/JS */

export interface PortionMeasure {
  id: string
  label: string
  defaultGrams: number
}

export const PORTION_MEASURES: PortionMeasure[] = [
  { id: 'unidade', label: 'Unidade(s)', defaultGrams: 100 },
  { id: 'colher', label: 'Colher de sopa', defaultGrams: 15 },
  { id: 'fatia', label: 'Fatia(s)', defaultGrams: 30 },
  { id: 'xicara', label: 'Xícara(s)', defaultGrams: 160 },
  { id: 'porcao', label: 'Porção(ões)', defaultGrams: 100 },
  { id: 'dosador', label: 'Dosador(es)', defaultGrams: 30 },
]

/** Gramas médias por unidade para alimentos comuns (referência TACO / porções típicas). */
const FOOD_UNIT_GRAMS: Array<{ pattern: RegExp; grams: number }> = [
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
  { pattern: /whey|prote[ií]na.*p[oó]|wpc|wpi|suplemento prote/i, grams: 30 },
  { pattern: /mussarela|mozzarella/i, grams: 30 },
]

export function guessGramsPerUnit(foodName: string, measureId = 'unidade'): number {
  const name = String(foodName || '').toLowerCase()
  if (measureId === 'unidade') {
    for (const entry of FOOD_UNIT_GRAMS) {
      if (entry.pattern.test(name)) return entry.grams
    }
  }
  const measure = PORTION_MEASURES.find((m) => m.id === measureId)
  return measure?.defaultGrams ?? 100
}

export function amountToGrams(amount: number, measureId: string, foodName: string): number {
  const qty = Math.max(0.1, Number(amount) || 1)
  if (measureId === 'grams') return Math.max(1, Math.round(qty))
  if (measureId === 'porcao_media') return Math.max(1, Math.round(qty * 100))
  const gramsPerUnit = guessGramsPerUnit(foodName, measureId)
  return Math.max(1, Math.round(qty * gramsPerUnit))
}

export function gramsToAmount(grams: number, measureId: string, foodName: string): number {
  const gramsPerUnit = guessGramsPerUnit(foodName, measureId)
  const safeGrams = Math.max(1, Number(grams) || 1)
  return Math.round((safeGrams / gramsPerUnit) * 10) / 10
}

export function parseMeasureFromUnit(unit: string): string {
  const raw = String(unit || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!raw) return 'unidade'
  if (raw === 'g' || raw === 'gr' || raw.startsWith('grama')) return 'grams'
  if (/^ml\b|mililitro/.test(raw)) return 'ml'
  if (/porcao media|porção média/.test(raw)) return 'porcao_media'
  if (/colher|sopa|\bcs\b/.test(raw)) return 'colher'
  if (/fatia/.test(raw)) return 'fatia'
  if (/xicara|xícara/.test(raw)) return 'xicara'
  if (/dosador|scoop|medida\(s\)/.test(raw)) return 'dosador'
  if (/porcao|porção|\bpor\b/.test(raw)) return 'porcao'
  return 'unidade'
}

export function formatPortionLabel(amount: number, measureId: string): string {
  const qty = Number(amount) || 1
  if (measureId === 'grams') return `${Math.round(qty)} g`
  if (measureId === 'porcao_media') return `${qty} porção média`
  const measure = PORTION_MEASURES.find((m) => m.id === measureId)
  const label = measure?.label ?? measureId
  return `${qty} ${label}`
}
