export const phoneCountries = [
  { code: 'BR', name: 'Brasil', dial: '+55', flag: '🇧🇷', mask: '(##) #####-####', maxDigits: 11 },
  { code: 'US', name: 'Estados Unidos', dial: '+1', flag: '🇺🇸', mask: '(###) ###-####', maxDigits: 10 },
  { code: 'CA', name: 'Canadá', dial: '+1', flag: '🇨🇦', mask: '(###) ###-####', maxDigits: 10 },
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
  { code: 'PE', name: 'Peru', dial: '+51', flag: '🇵🇪', mask: '### ### ###', maxDigits: 9 },
  { code: 'PY', name: 'Paraguai', dial: '+595', flag: '🇵🇾', mask: '### ### ###', maxDigits: 9 },
  { code: 'UY', name: 'Uruguai', dial: '+598', flag: '🇺🇾', mask: '## ### ###', maxDigits: 8 },
  { code: 'BO', name: 'Bolívia', dial: '+591', flag: '🇧🇴', mask: '# ### ####', maxDigits: 8 },
  { code: 'EC', name: 'Equador', dial: '+593', flag: '🇪🇨', mask: '## ### ####', maxDigits: 9 },
  { code: 'VE', name: 'Venezuela', dial: '+58', flag: '🇻🇪', mask: '### ### ####', maxDigits: 10 },
  { code: 'JP', name: 'Japão', dial: '+81', flag: '🇯🇵', mask: '## #### ####', maxDigits: 10 },
  { code: 'AU', name: 'Austrália', dial: '+61', flag: '🇦🇺', mask: '### ### ###', maxDigits: 9 },
]

export const defaultPhoneCountry = phoneCountries[0]

/** ISO 3166-1 alpha-2 → código do flagcdn (minúsculo). */
export function countryFlagUrl(code) {
  const normalized = String(code || 'BR').trim().toLowerCase()
  return `https://flagcdn.com/w40/${normalized}.png`
}

export function digitsOnly(value = '') {
  return String(value || '').replace(/\D/g, '')
}

export function applyPhoneMask(digits, mask) {
  if (!mask) return digits
  const clean = digitsOnly(digits)
  let result = ''
  let digitIndex = 0

  for (let i = 0; i < mask.length; i += 1) {
    if (digitIndex >= clean.length) break
    if (mask[i] === '#') {
      result += clean[digitIndex]
      digitIndex += 1
    } else {
      result += mask[i]
    }
  }

  return result
}

function resolveMask(digits, country = defaultPhoneCountry) {
  if (country.code === 'BR') {
    return digits.length <= 10 ? '(##) ####-####' : '(##) #####-####'
  }
  return country.mask
}

export function formatNationalPhone(digits, country = defaultPhoneCountry) {
  const max = Number(country?.maxDigits) || 15
  const limited = digitsOnly(digits).slice(0, max)
  return applyPhoneMask(limited, resolveMask(limited, country))
}

export function phonePlaceholder(country = defaultPhoneCountry) {
  if (country.code === 'BR') {
    return '(00) 00000-0000'
  }
  return (country.mask || '').replace(/#/g, '0')
}

export function toInternationalPhone(digits, country = defaultPhoneCountry) {
  const max = Number(country?.maxDigits) || 15
  const national = digitsOnly(digits).slice(0, max)
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

  // Prefer BR when dial is +55; for +1 prefer US over CA unless already known.
  let matched = sorted.find((country) => normalized.startsWith(country.dial))
  if (matched?.dial === '+1') {
    matched = countries.find((c) => c.code === 'US') || matched
  }

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
