import { amountToGrams, guessGramsPerUnit } from './meal-portion-measures.js'

export const EXTRA_QUANTITY_UNITS = [
  { id: 'g', label: 'Gramas (g)' },
  { id: 'kg', label: 'Quilogramas (kg)' },
  { id: 'ml', label: 'Mililitros (ml)' },
  { id: 'unidade', label: 'Unidade(s)' },
]

export function defaultExtraQuantityForUnit(foodName, unit = 'unidade') {
  const gramsPerUnit = guessGramsPerUnit(foodName, 'unidade')

  if (unit === 'unidade') {
    return { amount: 1, unit: 'unidade' }
  }

  if (unit === 'g') {
    return { amount: gramsPerUnit, unit: 'g' }
  }

  if (unit === 'kg') {
    return { amount: Math.round((gramsPerUnit / 1000) * 1000) / 1000, unit: 'kg' }
  }

  if (unit === 'ml') {
    return { amount: gramsPerUnit, unit: 'ml' }
  }

  return { amount: 1, unit: 'unidade' }
}

export function resolveExtraItemGrams(amount, unit, foodName) {
  const qty = Number(amount)
  if (!Number.isFinite(qty) || qty <= 0) return 0

  if (unit === 'g') return Math.round(qty)
  if (unit === 'kg') return Math.round(qty * 1000)
  if (unit === 'ml') return Math.round(qty)
  if (unit === 'unidade') return amountToGrams(qty, 'unidade', foodName)

  return Math.round(qty)
}

export function formatExtraItemLabel(name, amount, unit) {
  const food = String(name || '').trim()
  if (!food) return ''

  const qty = Number(amount)
  if (!Number.isFinite(qty) || qty <= 0) return food

  if (unit === 'g') return `${Math.round(qty)} g ${food}`
  if (unit === 'kg') {
    const label = String(qty).replace('.', ',')
    return `${label} kg ${food}`
  }
  if (unit === 'ml') return `${Math.round(qty)} ml ${food}`

  const count = Math.round(qty * 10) / 10
  if (count === 1) return `1 ${food}`
  if (Number.isInteger(count)) return `${count} unidades de ${food}`
  return `${String(count).replace('.', ',')} ${food}`
}
