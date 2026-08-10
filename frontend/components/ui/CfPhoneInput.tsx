'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { AnimatedPopover } from '@/components/overlays'
import {
  countryFlagUrl,
  defaultPhoneCountry,
  digitsOnly,
  formatNationalPhone,
  parseInternationalPhone,
  phoneCountries,
  phonePlaceholder,
  toInternationalPhone,
  type PhoneCountry,
} from '@/lib/phone-countries'
import styles from './CfPhoneInput.module.scss'

type Props = {
  value: string
  onChange: (value: string) => void
  id?: string
  label?: string
  disabled?: boolean
  className?: string
}

function Flag({ code }: { code: string }) {
  return (
    <span className={styles.flag} aria-hidden>
      <img
        className={styles.flagImg}
        src={countryFlagUrl(code)}
        alt={code}
        width={20}
        height={15}
        loading="lazy"
        decoding="async"
      />
    </span>
  )
}

export function CfPhoneInput({
  value,
  onChange,
  id: idProp,
  label,
  disabled = false,
  className = '',
}: Props) {
  const autoId = useId()
  const id = idProp || autoId
  const inputRef = useRef<HTMLInputElement>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<PhoneCountry>(defaultPhoneCountry)
  const [nationalDigits, setNationalDigits] = useState('')
  const [displayValue, setDisplayValue] = useState('')

  const placeholder = phonePlaceholder(selectedCountry)
  const maxDigits = Number(selectedCountry?.maxDigits) || 11
  const inputMaxLength = formatNationalPhone('9'.repeat(maxDigits), selectedCountry).length

  useEffect(() => {
    const international = toInternationalPhone(nationalDigits, selectedCountry)
    if ((value || '') !== international) {
      const parsed = parseInternationalPhone(value)
      setSelectedCountry(parsed.country)
      setNationalDigits(parsed.nationalDigits)
      setDisplayValue(parsed.display)
    }
    // Sync only when parent value diverges (controlled).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function emitDigits(rawDigits: string, country: PhoneCountry) {
    const limited = digitsOnly(rawDigits).slice(0, Number(country?.maxDigits) || 11)
    const display = formatNationalPhone(limited, country)
    setNationalDigits(limited)
    setDisplayValue(display)
    onChange(toInternationalPhone(limited, country))
    return display
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    const display = emitDigits(event.target.value, selectedCountry)
    event.target.value = display
  }

  function onKeydown(event: KeyboardEvent<HTMLInputElement>) {
    const isDigit = event.key.length === 1 && /\d/.test(event.key)
    if (!isDigit) return
    const el = inputRef.current
    const replacing = Boolean(el && el.selectionStart !== el.selectionEnd)
    if (nationalDigits.length >= maxDigits && !replacing) {
      event.preventDefault()
    }
  }

  function selectCountry(country: PhoneCountry) {
    setSelectedCountry(country)
    emitDigits(nationalDigits, country)
    setMenuOpen(false)
    queueMicrotask(() => inputRef.current?.focus())
  }

  const shell = (
    <div
      className={`${styles.input} cf-phone-input cf-squircle--control ${focused || menuOpen ? styles.inputFocused : ''}`}
    >
      <div className={`${styles.country} cf-phone-country`}>
        <AnimatedPopover
          open={menuOpen}
          onOpenChange={(next) => {
            if (disabled) return
            setMenuOpen(next)
          }}
          side="bottom"
          align="start"
          sideOffset={6}
          contentClassName={`${styles.menu} cf-phone-country-menu`}
          trigger={
            <button
              type="button"
              className={`${styles.countryBtn} cf-phone-country-btn`}
              disabled={disabled}
              aria-expanded={menuOpen}
              aria-haspopup="listbox"
            >
              <Flag code={selectedCountry.code} />
              <span className={styles.dial}>{selectedCountry.dial}</span>
              <ChevronDown className={styles.chevron} size={14} aria-hidden />
            </button>
          }
        >
          <ul className={styles.menuList} role="listbox">
            {phoneCountries.map((country) => {
              const active = country.code === selectedCountry.code
              return (
                <li key={country.code} role="presentation">
                  <button
                    type="button"
                    role="option"
                    className={`${styles.option} ${active ? styles.optionActive : ''}`}
                    aria-selected={active}
                    onClick={() => selectCountry(country)}
                  >
                    <Flag code={country.code} />
                    <span className={styles.countryName}>{country.name}</span>
                    <span className={styles.dial}>{country.dial}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </AnimatedPopover>
      </div>

      <input
        id={id}
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={displayValue}
        placeholder={placeholder}
        maxLength={inputMaxLength}
        disabled={disabled}
        onChange={onInput}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeydown}
      />
    </div>
  )

  const rootClass = [
    'cf-phone',
    styles.root,
    label ? 'field field--float' : '',
    focused || menuOpen ? 'is-focused focused' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (label) {
    return (
      <div className={rootClass}>
        <label htmlFor={id}>{label}</label>
        {shell}
      </div>
    )
  }

  return <div className={rootClass}>{shell}</div>
}
