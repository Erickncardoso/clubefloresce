'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import type { MacroTotals, MealEntry, MealPlanFormData } from '@/lib/meal-plan/types'
import { computeLiveNutritionTotals, formatMacroGrams, formatMacroKcal, resolvedMealMacros } from '@/lib/meal-plan/prescription'
import styles from './PatientMealPlanNutritionFullModal.module.scss'

interface Props {
  open: boolean
  form: MealPlanFormData
  onClose: () => void
}

interface MealRow {
  id: string
  label: string
  time: string
  caloriesKcal: number
  carbsG: number
  proteinG: number
  fatG: number
}

interface FoodRow {
  id: string
  mealLabel: string
  name: string
  portion: string
  caloriesKcal: number
  carbsG: number
  proteinG: number
  fatG: number
}

function buildMealRows(meals: MealEntry[]): MealRow[] {
  return meals
    .map((meal) => {
      const macros = resolvedMealMacros(meal)
      return {
        id: meal.id,
        label: meal.label || '—',
        time: meal.time || '',
        caloriesKcal: macros.caloriesKcal ?? 0,
        carbsG: macros.carbsG ?? 0,
        proteinG: macros.proteinG ?? 0,
        fatG: macros.fatG ?? 0,
      }
    })
    .filter((r) => r.caloriesKcal > 0)
}

function buildFoodRows(meals: MealEntry[]): FoodRow[] {
  const rows: FoodRow[] = []
  for (const meal of meals) {
    for (const item of meal.items ?? []) {
      if (!item.per100g?.caloriesKcal) continue
      const grams = item.grams ?? 100
      const r = grams / 100
      const cho = (item.per100g.carbsG ?? 0) * r
      const ptn = (item.per100g.proteinG ?? 0) * r
      const fat = (item.per100g.fatG ?? 0) * r
      const kcal = (item.per100g.caloriesKcal ?? 0) * r
      const portionParts = [item.amount, item.unit].filter(Boolean).join(' ')
      rows.push({
        id: item.id,
        mealLabel: meal.label || '—',
        name: item.name || item.display || '—',
        portion: portionParts || `${grams}g`,
        caloriesKcal: Math.round(kcal),
        carbsG: cho,
        proteinG: ptn,
        fatG: fat,
      })
    }
  }
  return rows
}

function buildPercents(totals: MacroTotals): { carbs: number; protein: number; fat: number } {
  const kcal = totals.caloriesKcal
  if (!kcal) return { carbs: 0, protein: 0, fat: 0 }
  return {
    carbs: Math.round(((totals.carbsG ?? 0) * 4 / kcal) * 100),
    protein: Math.round(((totals.proteinG ?? 0) * 4 / kcal) * 100),
    fat: Math.round(((totals.fatG ?? 0) * 9 / kcal) * 100),
  }
}

function OverviewDonut({ totals, pcts }: { totals: MacroTotals; pcts: ReturnType<typeof buildPercents> }) {
  const circumference = 2 * Math.PI * 46
  const choArc = (pcts.carbs / 100) * circumference
  const ptnArc = (pcts.protein / 100) * circumference
  const fatArc = (pcts.fat / 100) * circumference

  const choOffset = 0
  const ptnOffset = -(circumference - choArc)
  const fatOffset = -(circumference - choArc - ptnArc)

  return (
    <div className={styles.donut}>
      <svg viewBox="0 0 120 120" className={styles.donutSvg} aria-hidden="true">
        <circle cx="60" cy="60" r="46" className={styles.donutTrack} />
        {pcts.carbs > 0 && (
          <circle
            cx="60" cy="60" r="46"
            className={`${styles.donutSeg} ${styles.donutSegCarb}`}
            strokeDasharray={`${choArc} ${circumference}`}
            strokeDashoffset={choOffset}
          />
        )}
        {pcts.protein > 0 && (
          <circle
            cx="60" cy="60" r="46"
            className={`${styles.donutSeg} ${styles.donutSegProt}`}
            strokeDasharray={`${ptnArc} ${circumference}`}
            strokeDashoffset={ptnOffset}
          />
        )}
        {pcts.fat > 0 && (
          <circle
            cx="60" cy="60" r="46"
            className={`${styles.donutSeg} ${styles.donutSegFat}`}
            strokeDasharray={`${fatArc} ${circumference}`}
            strokeDashoffset={fatOffset}
          />
        )}
      </svg>
      <div className={styles.donutCenter}>
        <strong>{formatMacroKcal(totals.caloriesKcal)}</strong>
        <span>Total</span>
      </div>
    </div>
  )
}

function MacroCard({
  tone,
  label,
  grams,
  pct,
}: {
  tone: 'carb' | 'prot' | 'fat'
  label: string
  grams: number
  pct: number
}) {
  return (
    <div className={`${styles.macroCard} ${styles[`macroCard${tone.charAt(0).toUpperCase() + tone.slice(1)}`]}`}>
      <span className={`${styles.macroCardDot} ${styles[`macroCardDot${tone.charAt(0).toUpperCase() + tone.slice(1)}`]}`} aria-hidden="true" />
      <div className={styles.macroCardMain}>
        <strong>{formatMacroGrams(grams)}</strong>
        <span>{label}</span>
      </div>
      <span className={styles.macroCardPct}>{pct}%</span>
    </div>
  )
}

export function PatientMealPlanNutritionFullModal({ open, form, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const meals = form.meals ?? []
  const totals = computeLiveNutritionTotals(form)
  const hasMacros = totals.caloriesKcal > 0
  const pcts = buildPercents(totals)
  const mealRows = buildMealRows(meals)
  const foodRows = buildFoodRows(meals)

  function handlePrint() {
    window.print()
  }

  const content = (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="mpnf-title">
      <div className={styles.backdrop} aria-hidden="true" onClick={onClose} />
      <div ref={panelRef} className={styles.panel}>
        {/* Header */}
        <header className={styles.head}>
          <div>
            <p className={styles.kicker}>Resumo nutricional</p>
            <h2 id="mpnf-title" className={styles.modalTitle}>Resumo completo</h2>
          </div>
          <div className={styles.headActions}>
            <button type="button" className="btn-secondary" onClick={handlePrint}>
              <Printer size={14} aria-hidden="true" />
              Imprimir
            </button>
            <button type="button" className="btn-secondary" aria-label="Fechar" onClick={onClose}>
              <X size={14} aria-hidden="true" />
              Fechar
            </button>
          </div>
        </header>

        <div className={styles.body}>
          {/* Overview */}
          {hasMacros && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Resumo Nutricional</h3>
              <div className={styles.overviewPanel}>
                <div className={styles.overview}>
                  <OverviewDonut totals={totals} pcts={pcts} />
                  <div className={styles.macroCards}>
                    <MacroCard tone="carb" label="Carboidratos" grams={totals.carbsG ?? 0} pct={pcts.carbs} />
                    <MacroCard tone="prot" label="Proteínas" grams={totals.proteinG ?? 0} pct={pcts.protein} />
                    <MacroCard tone="fat" label="Lipídios" grams={totals.fatG ?? 0} pct={pcts.fat} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Por refeição */}
          {mealRows.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Por refeição</h3>
              <div className={styles.tableWrap}>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Refeição</th>
                        <th>Kcal</th>
                        <th>Carb (g)</th>
                        <th>Prot (g)</th>
                        <th>Lip (g)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mealRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            {row.time && <span className={styles.rowTime}>{row.time}</span>}
                            {row.label}
                          </td>
                          <td>{formatMacroKcal(row.caloriesKcal)}</td>
                          <td>{formatMacroGrams(row.carbsG)}</td>
                          <td>{formatMacroGrams(row.proteinG)}</td>
                          <td>{formatMacroGrams(row.fatG)}</td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className={styles.totalRow}>
                        <td><strong>Total</strong></td>
                        <td><strong>{formatMacroKcal(totals.caloriesKcal)}</strong></td>
                        <td><strong>{formatMacroGrams(totals.carbsG)}</strong></td>
                        <td><strong>{formatMacroGrams(totals.proteinG)}</strong></td>
                        <td><strong>{formatMacroGrams(totals.fatG)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Composição por alimento */}
          {foodRows.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Composição por alimento</h3>
              <div className={styles.tableWrap}>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Alimento</th>
                        <th>Qtd</th>
                        <th>Kcal</th>
                        <th>Carb</th>
                        <th>Prot</th>
                        <th>Lip</th>
                      </tr>
                    </thead>
                    <tbody>
                      {foodRows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.name}</td>
                          <td>{row.portion}</td>
                          <td>{formatMacroKcal(row.caloriesKcal)}</td>
                          <td>{formatMacroGrams(row.carbsG)}</td>
                          <td>{formatMacroGrams(row.proteinG)}</td>
                          <td>{formatMacroGrams(row.fatG)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {!hasMacros && (
            <p className={styles.empty}>
              Nenhum dado nutricional disponível. Adicione alimentos com vínculo na TBCA/TACO para ver o resumo completo.
            </p>
          )}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}
