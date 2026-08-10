'use client'

import { useId, useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { AnimatedPopover } from '@/components/overlays'
import styles from './CfSelect.module.scss'

export type CfSelectOption = {
  value: string
  label: string
}

type Props = {
  value?: string
  onChange?: (value: string) => void
  options: CfSelectOption[]
  id?: string
  placeholder?: string
  disabled?: boolean
}

export function CfSelect({
  value = '',
  onChange,
  options,
  id: idProp,
  placeholder = 'Selecionar',
  disabled = false,
}: Props) {
  const autoId = useId()
  const id = idProp || autoId
  const [open, setOpen] = useState(false)

  const selected = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value],
  )

  return (
    <div className={`cf-select ${styles.root} ${open ? styles.open : ''}`}>
      <AnimatedPopover
        open={open}
        onOpenChange={(next) => {
          if (disabled) return
          setOpen(next)
        }}
        side="bottom"
        align="start"
        sideOffset={6}
        contentClassName={styles.menu}
        trigger={
          <button
            id={id}
            type="button"
            className={`${styles.trigger} cf-squircle cf-squircle--control`}
            disabled={disabled}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <span className={styles.value}>{selected?.label ?? placeholder}</span>
            <ChevronDown className={styles.chevron} size={16} aria-hidden />
          </button>
        }
      >
        <div role="listbox" aria-labelledby={id}>
          {options.map((option) => {
            const active = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                className={`${styles.option} ${active ? styles.optionActive : ''}`}
                aria-selected={active}
                onClick={() => {
                  onChange?.(option.value)
                  setOpen(false)
                }}
              >
                <span className={styles.optionLabel}>{option.label}</span>
                {active ? <Check size={15} className={styles.check} aria-hidden /> : null}
              </button>
            )
          })}
        </div>
      </AnimatedPopover>
    </div>
  )
}
