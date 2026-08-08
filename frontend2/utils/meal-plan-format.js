/**
 * Formata itens do cardápio com unidades padronizadas (g, ml, L, fatias, colheres).
 * @param {string | { food: string, amount?: number, unit: string, qualifier?: string }} item
 */
import {
  normalizeMealPlanItem,
  parseDietboxItemLine,
  resolveMealItemDisplay,
} from './meal-plan-display-parse.js'

export function formatMealItemLabel(item) {
  if (typeof item === 'string') return item

  const normalized = normalizeMealPlanItem(item)
  const fromDisplay = resolveMealItemDisplay(normalized)
  if (fromDisplay) return fromDisplay

  const food = normalized.food || normalized.name
  const { amount, unit, qualifier } = normalized
  if (!food) return ''

  if (unit === 'avontade') {
    return `${capitalizeFood(food)} à vontade`
  }

  if (unit === 'g' || unit === 'ml') {
    const qty = Math.round(Number(amount) || 0)
    return `${qty} ${unit} ${food}`
  }

  if (unit === 'l') {
    const qty = formatDecimal(amount)
    return `${qty} L ${food}`
  }

  if (unit === 'fatia') {
    const qty = Math.round(Number(amount) || 1)
    const label = qty === 1 ? 'fatia' : 'fatias'
    return `${qty} ${label} de ${food}`
  }

  if (unit === 'colher') {
    const qty = Math.round(Number(amount) || 1)
    const spoon = qualifier === 'sopa' ? 'col. (sopa)' : 'col.'
    return `${qty} ${spoon} de ${food}`
  }

  if (unit === 'unidade') {
    const qty = formatUnitAmount(amount)
    if (!qty) return food
    const count = Number(amount)
    if (Number.isInteger(count) && count > 1) return `${qty} unidades de ${food}`
    return `${qty} ${food}`
  }

  if (unit === 'ovos') {
    const qty = Math.round(Number(amount) || 1)
    const label = qty === 1 ? 'ovo' : 'ovos'
    return `Omelete com ${qty} ${label}`
  }

  if (amount != null) {
    return `${formatDecimal(amount)} ${unit} ${food}`
  }

  return capitalizeFood(food)
}

export function formatMealItemsLabels(items = []) {
  return items.map(formatMealItemLabel)
}

function formatUnitAmount(amount) {
  const value = Number(amount)
  if (value === 0.5) return '1/2'
  if (value === 0.25) return '1/4'
  if (value === 0.75) return '3/4'
  if (Number.isInteger(value)) return String(value)
  return formatDecimal(value)
}

function formatDecimal(value) {
  return String(Number(value)).replace('.', ',')
}

function capitalizeFood(food) {
  if (!food) return ''
  return food.charAt(0).toUpperCase() + food.slice(1)
}

/** Parse display string into name, amount, unit, grams/ml for editor/override items. */
export function normalizeFoodEditorItem(item) {
  if (!item || typeof item !== 'object') return item

  const display = String(item.display || '').trim()
  if (!display) return item

  const parsed = parseDietboxItemLine(display)
  if (parsed?.name) {
    item.name = parsed.name
    item.amount = parsed.amount ?? item.amount ?? null
    item.unit = parsed.unit ?? item.unit ?? ''
    item.grams = parsed.grams ?? item.grams ?? null
    item.ml = parsed.ml ?? item.ml ?? null
    item.display = parsed.display
    return item
  }

  return item
}
