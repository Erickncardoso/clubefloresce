export const phoneCountries = [
  { code: 'BR', name: 'Brasil', dial: '+55', flag: '🇧🇷', mask: '(##) #####-####', maxDigits: 11 },
  { code: 'US', name: 'Estados Unidos', dial: '+1', flag: '🇺🇸', mask: '(###) ###-####', maxDigits: 10 },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹', mask: '### ### ###', maxDigits: 9 },
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷', mask: '## ####-####', maxDigits: 10 },
  { code: 'ES', name: 'Espanha', dial: '+34', flag: '🇪🇸', mask: '### ### ###', maxDigits: 9 },
  { code: 'GB', name: 'Reino Unido', dial: '+44', flag: '🇬🇧', mask: '#### ######', maxDigits: 10 },
  { code: 'FR', name: 'França', dial: '+33', flag: '🇫🇷', mask: '# ## ## ## ##', maxDigits: 9 },
  { code: 'DE', name: 'Alemanha', dial: '+49', flag: '🇩🇪', mask: '#### #######', maxDigits: 11 },
  { code: 'IT', name: 'Itália', dial: '+39', flag: '🇮🇹', mask: '### ### ####', maxDigits: 10 },
  { code: 'MX', name: 'México', dial: '+52', flag: '🇲🇽', mask: '## #### ####', maxDigits: 10 },
  { code: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱', mask: '# #### ####', maxDigits: 9 },
  { code: 'CO', name: 'Colômbia', dial: '+57', flag: '🇨🇴', mask: '### ### ####', maxDigits: 10 },
  { code: 'PY', name: 'Paraguai', dial: '+595', flag: '🇵🇾', mask: '### ### ###', maxDigits: 9 },
  { code: 'UY', name: 'Uruguai', dial: '+598', flag: '🇺🇾', mask: '## ### ###', maxDigits: 8 },
]

export const defaultPhoneCountry = phoneCountries[0]

export function digitsOnly(value = '') {
  return String(value || '').replace(/\D/g, '')
}

export function applyPhoneMask(digits, mask) {
  if (!mask) return digits
  let result = ''
  let digitIndex = 0

  for (let i = 0; i < mask.length && digitIndex < digits.length; i += 1) {
    if (mask[i] === '#') {
      result += digits[digitIndex]
      digitIndex += 1
    } else {
      result += mask[i]
    }
  }

  return result
}

export function formatNationalPhone(digits, country = defaultPhoneCountry) {
  const limited = digitsOnly(digits).slice(0, country.maxDigits)
  return applyPhoneMask(limited, country.mask)
}

export function toInternationalPhone(digits, country = defaultPhoneCountry) {
  const national = digitsOnly(digits).slice(0, country.maxDigits)
  if (!national) return ''
  return `${country.dial}${national}`
}

export function parseInternationalPhone(value, countries = phoneCountries) {
  const raw = String(value || '').trim()
  if (!raw) {
    return { country: defaultPhoneCountry, nationalDigits: '', display: '' }
  }

  const normalized = raw.startsWith('+') ? raw : `+${digitsOnly(raw)}`
  const sorted = [...countries].sort((a, b) => b.dial.length - a.dial.length)
  const matched = sorted.find((country) => normalized.startsWith(country.dial))

  if (!matched) {
    const fallbackDigits = digitsOnly(raw).slice(0, defaultPhoneCountry.maxDigits)
    return {
      country: defaultPhoneCountry,
      nationalDigits: fallbackDigits,
      display: formatNationalPhone(fallbackDigits, defaultPhoneCountry),
    }
  }

  const nationalDigits = digitsOnly(normalized.slice(matched.dial.length)).slice(0, matched.maxDigits)
  return {
    country: matched,
    nationalDigits,
    display: formatNationalPhone(nationalDigits, matched),
  }
}
