export function onlyDigits(value, max) {
  const digits = String(value ?? '').replace(/\D/g, '')
  return typeof max === 'number' ? digits.slice(0, max) : digits
}

export function maskCardNumber(value) {
  const digits = onlyDigits(value, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

export function maskCardExpiry(value) {
  const digits = onlyDigits(value, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function maskCpf(value) {
  const digits = onlyDigits(value, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function maskCvv(value) {
  return onlyDigits(value, 4)
}
