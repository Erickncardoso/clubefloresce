'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { AnimatedPopover } from '@/components/overlays'
import styles from './CfDateInput.module.scss'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

function parseIso(value?: string | null) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function toIsoDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplay(value?: string | null, placeholder = 'dd/mm/aaaa') {
  const date = parseIso(value)
  if (!date) return placeholder
  return date.toLocaleDateString('pt-BR')
}

function maskDigits(digits: string) {
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function parseBrazilianToIso(display: string) {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return toIsoDate(date)
}

type Props = {
  value?: string
  onChange?: (value: string) => void
  id?: string
  min?: string
  max?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  /** Texto digitável + botão de calendário (padrão admin) */
  editable?: boolean
}

export function CfDateInput({
  value = '',
  onChange,
  id: idProp,
  min,
  max,
  required = false,
  disabled = false,
  placeholder = 'dd/mm/aaaa',
  editable = true,
}: Props) {
  const autoId = useId()
  const id = idProp || autoId
  const [open, setOpen] = useState(false)
  const [textValue, setTextValue] = useState(() => (value ? formatDisplay(value, '') : ''))
  const [textFocused, setTextFocused] = useState(false)
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const todayIso = toIsoDate(now)

  useEffect(() => {
    if (!textFocused) setTextValue(value ? formatDisplay(value, '') : '')
  }, [value, textFocused])

  function isDisabled(iso: string) {
    if (min && iso < min) return true
    if (max && iso > max) return true
    return false
  }

  function syncViewToValue() {
    const date = parseIso(value) || new Date()
    setViewYear(date.getFullYear())
    setViewMonth(date.getMonth())
  }

  function emit(next: string) {
    onChange?.(next)
  }

  function selectDate(iso: string) {
    if (isDisabled(iso)) return
    emit(iso)
    setTextValue(formatDisplay(iso, ''))
    setOpen(false)
  }

  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1)
    const startOffset = firstOfMonth.getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const list: Array<{
      key: string
      day: number
      iso: string
      inMonth: boolean
      isToday: boolean
      isSelected: boolean
      disabled: boolean
      label: string
    }> = []

    for (let i = 0; i < 42; i += 1) {
      const dayIndex = i - startOffset + 1
      const date = new Date(viewYear, viewMonth, dayIndex)
      const inMonth = dayIndex >= 1 && dayIndex <= daysInMonth
      const iso = toIsoDate(date)
      list.push({
        key: `${viewYear}-${viewMonth}-${i}`,
        day: date.getDate(),
        iso,
        inMonth,
        isToday: iso === todayIso,
        isSelected: iso === value,
        disabled: isDisabled(iso),
        label: date.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      })
    }
    return list
  }, [viewYear, viewMonth, value, todayIso, min, max])

  const panel = (
    <div className={styles.panelInner}>
      <div className={styles.panelHead}>
        <button
          type="button"
          className={styles.nav}
          aria-label="Mês anterior"
          onClick={() => {
            if (viewMonth === 0) {
              setViewMonth(11)
              setViewYear((y) => y - 1)
            } else setViewMonth((m) => m - 1)
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <div className={styles.panelTitle}>
          {MONTHS[viewMonth]} de {viewYear}
        </div>
        <button
          type="button"
          className={styles.nav}
          aria-label="Próximo mês"
          onClick={() => {
            if (viewMonth === 11) {
              setViewMonth(0)
              setViewYear((y) => y + 1)
            } else setViewMonth((m) => m + 1)
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className={styles.weekdays} aria-hidden>
        {WEEKDAYS.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>

      <div className={styles.grid} role="grid">
        {cells.map((cell) => (
          <button
            key={cell.key}
            type="button"
            role="gridcell"
            className={[
              styles.day,
              !cell.inMonth ? styles.dayOutside : '',
              cell.isToday ? styles.dayToday : '',
              cell.isSelected ? styles.daySelected : '',
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={cell.disabled}
            aria-label={cell.label}
            aria-selected={cell.isSelected}
            onClick={() => selectDate(cell.iso)}
          >
            {cell.day}
          </button>
        ))}
      </div>

      <div className={styles.panelFoot}>
        {!required ? (
          <button
            type="button"
            className={styles.footBtn}
            onClick={() => {
              emit('')
              setTextValue('')
              setOpen(false)
            }}
          >
            Limpar
          </button>
        ) : (
          <span aria-hidden />
        )}
        <button
          type="button"
          className={`${styles.footBtn} ${styles.footBtnPrimary}`}
          onClick={() => selectDate(todayIso)}
        >
          Hoje
        </button>
      </div>
    </div>
  )

  const calendarBtn = (
    <button
      type="button"
      className={styles.calendarBtn}
      disabled={disabled}
      aria-label="Abrir calendário"
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={() => {
        if (disabled) return
        if (!open) syncViewToValue()
      }}
    >
      <Calendar className={styles.icon} aria-hidden size={17} />
    </button>
  )

  if (editable) {
    return (
    <div
      className={[
        'cf-date-input',
        styles.root,
        open ? styles.open : '',
        disabled ? styles.disabled : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
        <div
          className={[
            styles.trigger,
            styles.triggerEditable,
            textFocused || open ? styles.triggerFocused : '',
            'cf-squircle',
            'cf-squircle--control',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <input
            id={id}
            type="text"
            className={styles.text}
            inputMode="numeric"
            autoComplete="bday"
            placeholder={placeholder}
            disabled={disabled}
            value={textValue}
            maxLength={10}
            aria-label="Data"
            onFocus={() => setTextFocused(true)}
            onBlur={() => {
              setTextFocused(false)
              if (!textValue.trim()) {
                if (!required) emit('')
                return
              }
              const iso = parseBrazilianToIso(textValue)
              if (iso && !isDisabled(iso)) {
                emit(iso)
                setTextValue(formatDisplay(iso, ''))
                return
              }
              setTextValue(value ? formatDisplay(value, '') : '')
            }}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
              const masked = maskDigits(digits)
              setTextValue(masked)
              if (digits.length === 8) {
                const iso = parseBrazilianToIso(masked)
                if (iso && !isDisabled(iso)) emit(iso)
              } else if (!digits.length) {
                emit('')
              }
            }}
          />
          <AnimatedPopover
            open={open}
            onOpenChange={(next) => {
              if (disabled) return
              if (next) syncViewToValue()
              setOpen(next)
            }}
            trigger={calendarBtn}
            contentClassName={styles.panel}
            side="bottom"
            align="end"
            sideOffset={6}
          >
            {panel}
          </AnimatedPopover>
        </div>
      </div>
    )
  }

  return (
    <div
      className={[
        'cf-date-input',
        styles.root,
        open ? styles.open : '',
        disabled ? styles.disabled : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <AnimatedPopover
        open={open}
        onOpenChange={(next) => {
          if (disabled) return
          if (next) syncViewToValue()
          setOpen(next)
        }}
        trigger={
          <button
            id={id}
            type="button"
            className={`${styles.trigger} cf-squircle cf-squircle--control`}
            disabled={disabled}
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <Calendar className={styles.icon} aria-hidden size={17} />
            <span className={`${styles.value} ${!value ? styles.valuePlaceholder : ''}`}>
              {formatDisplay(value, placeholder)}
            </span>
          </button>
        }
        contentClassName={styles.panel}
        side="bottom"
        align="start"
        sideOffset={6}
      >
        {panel}
      </AnimatedPopover>
    </div>
  )
}
