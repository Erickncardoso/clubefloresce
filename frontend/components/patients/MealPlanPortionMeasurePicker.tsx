'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpDown, ChevronDown, Clock, CornerDownLeft } from 'lucide-react'
import type { FoodItemPer100g } from '@/lib/meal-plan/types'
import {
  PORTION_MEASURES,
  amountToGrams,
  guessGramsPerUnit,
} from '@/lib/meal-plan/portion-measures'
import styles from './MealPlanPortionMeasurePicker.module.scss'

export interface PortionChange {
  measureId: string
  amount: number
  grams: number
}

interface MacroResult {
  caloriesKcal: number
  carbsG: number | null
  proteinG: number | null
  fatG: number | null
}

interface PortionOption {
  id: string
  label: string
  hint: string
  grams: number
  gramsLabel: string
  macros: MacroResult | null
}

interface Props {
  foodName?: string
  per100g?: FoodItemPer100g | null
  amount: number
  measureId: string
  onAmountChange: (amount: number) => void
  onMeasureChange: (measureId: string) => void
  onChange: (change: PortionChange) => void
  onSubmit?: () => void
  onCancel?: () => void
}

export interface MealPlanPortionMeasurePickerHandle {
  focus: () => void
}

function round1(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(Number(v))) return null
  return Math.round(Number(v) * 10) / 10
}

function calcMacros(per100g: FoodItemPer100g | null | undefined, grams: number): MacroResult | null {
  if (!per100g || per100g.caloriesKcal == null) return null
  const r = grams / 100
  return {
    caloriesKcal: Math.round((per100g.caloriesKcal ?? 0) * r),
    carbsG: round1((per100g.carbsG ?? 0) * r),
    proteinG: round1((per100g.proteinG ?? 0) * r),
    fatG: round1((per100g.fatG ?? 0) * r),
  }
}

function formatMacro(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const num = Number(value)
  return `${Number.isInteger(num) ? num : num.toFixed(1).replace(/\.0$/, '')}g`
}

export const MealPlanPortionMeasurePicker = forwardRef<MealPlanPortionMeasurePickerHandle, Props>(
  function MealPlanPortionMeasurePicker(
    { foodName = '', per100g, amount, measureId, onAmountChange, onMeasureChange, onChange, onSubmit, onCancel },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null)
    const qtyRef = useRef<HTMLInputElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    useImperativeHandle(ref, () => ({
      focus() {
        qtyRef.current?.focus()
        qtyRef.current?.select()
      },
    }))

    const buildOptions = useCallback((): PortionOption[] => {
      const qty = Math.max(0.1, Number(amount) || 1)

      const base: Omit<PortionOption, 'macros'>[] = [
        {
          id: 'grams',
          label: 'Gramas',
          hint: 'Por peso',
          grams: Math.max(1, Math.round(qty)),
          gramsLabel: `${Math.max(1, Math.round(qty))} g`,
        },
        {
          id: 'porcao_media',
          label: 'Porção média',
          hint: 'Equivalente a 100 g',
          grams: 100,
          gramsLabel: '100 g',
        },
        ...PORTION_MEASURES.map((measure) => {
          const gpu = guessGramsPerUnit(foodName, measure.id)
          const grams = Math.max(1, Math.round(qty * gpu))
          return {
            id: measure.id,
            label: measure.label,
            hint: measure.id === 'unidade' ? 'Por unidade' : 'Medida caseira',
            grams,
            gramsLabel: `${qty} ${measure.label.replace(/\(ões\)|\(s\)/g, '').trim()} = ${grams}g`,
          }
        }),
      ]

      return base.map((opt) => ({
        ...opt,
        macros: calcMacros(per100g, opt.grams),
      }))
    }, [amount, foodName, per100g])

    const options = buildOptions()

    const selectedLabel = options.find((o) => o.id === measureId)?.label ?? 'Medida'

    function updatePanelPosition() {
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.max(rect.width, 360)
      const maxLeft = Math.max(8, window.innerWidth - width - 8)
      setPanelStyle({
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        left: `${Math.min(rect.left, maxLeft)}px`,
        width: `${width}px`,
        zIndex: 10200,
      })
    }

    function emitChange(newMeasureId: string, newAmount: number) {
      const opt = options.find((o) => o.id === newMeasureId) ?? options[0]
      const grams = newMeasureId === 'grams'
        ? Math.max(1, Math.round(Number(newAmount) || 1))
        : (opt?.grams ?? amountToGrams(newAmount, newMeasureId, foodName))
      onMeasureChange(newMeasureId)
      onAmountChange(Number(newAmount) || 1)
      onChange({ measureId: newMeasureId, amount: Number(newAmount) || 1, grams })
    }

    function openPanel() {
      setOpen(true)
      requestAnimationFrame(updatePanelPosition)
    }

    function closePanel() {
      setOpen(false)
      setActiveIndex(-1)
    }

    function togglePanel() {
      if (open) closePanel()
      else openPanel()
    }

    function selectOption(option: PortionOption) {
      emitChange(option.id, amount)
      closePanel()
    }

    function handleAmountInput(e: React.ChangeEvent<HTMLInputElement>) {
      const value = Math.max(0.1, Number(e.target.value) || 1)
      onAmountChange(value)
      emitChange(measureId, value)
      if (!open) openPanel()
      requestAnimationFrame(updatePanelPosition)
    }

    function handleQtyKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key === 'Enter') {
        e.preventDefault()
        closePanel()
        onSubmit?.()
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        if (open) { closePanel(); return }
        onCancel?.()
      }
    }

    function moveActive(delta: number) {
      setActiveIndex((prev) => {
        if (!options.length) return prev
        const next = prev + delta
        if (next < 0) return options.length - 1
        if (next >= options.length) return 0
        return next
      })
    }

    useEffect(() => {
      function onDocKeyDown(e: KeyboardEvent) {
        if (!open) return
        if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1) }
        else if (e.key === 'Enter' && activeIndex >= 0) {
          e.preventDefault()
          selectOption(options[activeIndex])
        } else if (e.key === 'Escape') {
          e.preventDefault()
          closePanel()
        }
      }
      function onPointerDown(e: PointerEvent) {
        const target = e.target as Node
        if (rootRef.current?.contains(target)) return
        if (panelRef.current?.contains(target)) return
        closePanel()
      }
      function onViewport() {
        if (open) updatePanelPosition()
      }
      document.addEventListener('keydown', onDocKeyDown)
      document.addEventListener('pointerdown', onPointerDown)
      window.addEventListener('resize', onViewport)
      window.addEventListener('scroll', onViewport, true)
      return () => {
        document.removeEventListener('keydown', onDocKeyDown)
        document.removeEventListener('pointerdown', onPointerDown)
        window.removeEventListener('resize', onViewport)
        window.removeEventListener('scroll', onViewport, true)
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, activeIndex, options])

    const panel = open && mounted ? createPortal(
      <div ref={panelRef} className={styles.panel} style={panelStyle} role="listbox">
        <div className={styles.panelHead}>
          <Clock aria-hidden="true" />
          <span>Medidas encontradas</span>
          <small>{options.length} opções</small>
        </div>

        <ul className={styles.list}>
          {options.map((option, idx) => (
            <li
              key={option.id}
              role="option"
              aria-selected={idx === activeIndex || option.id === measureId}
              className={`${styles.item} ${(idx === activeIndex || option.id === measureId) ? styles.itemActive : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectOption(option)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <div className={styles.itemMain}>
                <strong>{option.label}</strong>
                <span className={styles.itemHint}>{option.hint}</span>
              </div>
              <div className={styles.itemSide}>
                <span className={styles.itemGrams}>{option.gramsLabel}</span>
                {option.macros && (
                  <span className={styles.itemMacros}>
                    <span className={`${styles.macro} ${styles.macroC}`}>C: {formatMacro(option.macros.carbsG)}</span>
                    <span className={`${styles.macro} ${styles.macroP}`}>P: {formatMacro(option.macros.proteinG)}</span>
                    <span className={`${styles.macro} ${styles.macroF}`}>L: {formatMacro(option.macros.fatG)}</span>
                    <span className={styles.kcal}>{option.macros.caloriesKcal} kcal</span>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>

        <footer className={styles.shortcuts}>
          <span><ArrowUpDown aria-hidden="true" /> Navegar</span>
          <span><CornerDownLeft aria-hidden="true" /> Enter Selecionar</span>
          <span>Esc Fechar</span>
        </footer>
      </div>,
      document.body,
    ) : null

    return (
      <div ref={rootRef} className={`${styles.root} ${open ? styles.rootOpen : ''}`}>
        <div className={styles.inputWrap}>
          <input
            ref={qtyRef}
            type="number"
            min={0.1}
            step="any"
            value={amount}
            className={styles.qty}
            inputMode="decimal"
            aria-label="Quantidade"
            onChange={handleAmountInput}
            onFocus={openPanel}
            onKeyDown={handleQtyKeyDown}
          />
          <button
            type="button"
            className={styles.trigger}
            aria-expanded={open}
            onMouseDown={(e) => e.preventDefault()}
            onClick={togglePanel}
          >
            <span>{selectedLabel}</span>
            <ChevronDown className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true" />
          </button>
        </div>
        {panel}
      </div>
    )
  },
)
