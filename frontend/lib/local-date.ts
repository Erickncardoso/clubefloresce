/** Interpreta YYYY-MM-DD como data civil, sem shift de fuso. */
export function parseDateKey(dateKey: string | null | undefined) {
  const match = String(dateKey || '')
    .slice(0, 10)
    .match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null
  return {
    year,
    month,
    day,
    date: new Date(year, month - 1, day),
  }
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const parsed = parseDateKey(dateKey)
  if (!parsed) return null
  const next = new Date(parsed.year, parsed.month - 1, parsed.day + days)
  const y = next.getFullYear()
  const m = String(next.getMonth() + 1).padStart(2, '0')
  const d = String(next.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDateKeyPtBr(
  dateKey: string,
  options: Intl.DateTimeFormatOptions = {},
) {
  const parsed = parseDateKey(dateKey)
  if (!parsed) return '—'
  return parsed.date.toLocaleDateString('pt-BR', options)
}
