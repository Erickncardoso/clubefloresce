/** Máscara de moeda BRL para inputs (ex.: 19,90). */

export function formatBrlCurrencyInput(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return ''
  const cents = Number(digits)
  if (!Number.isFinite(cents)) return ''
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatBrlFromNumber(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value < 0) return ''
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function parseBrlCurrencyInput(formatted) {
  const digits = String(formatted ?? '').replace(/\D/g, '')
  if (!digits) return 0
  const value = Number(digits) / 100
  return Number.isFinite(value) ? value : 0
}
