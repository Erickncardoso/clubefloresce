'use client'

import { ClipboardList, FileDown, Target } from 'lucide-react'
import type { MacroTotals } from '@/lib/meal-plan/types'
import { formatMacroGrams, formatMacroKcal } from '@/lib/meal-plan/prescription'
import styles from './PatientMealPlanNutritionSummary.module.scss'

interface Props {
  liveTotals: MacroTotals
  /** Goals defined via the NutritionGoalsModal (reserved for future display) */
  nutritionGoals?: Partial<MacroTotals> | null
  pdfLoading?: boolean
  onOpenFull: () => void
  onOpenGoals: () => void
  onExportPdf?: () => void
}

function buildDonutGradient(choPct: number, ptnPct: number, fatPct: number): string {
  const total = choPct + ptnPct + fatPct
  if (total <= 0) return 'conic-gradient(#e8ece9 0% 100%)'
  const choEnd = choPct
  const ptnEnd = choEnd + ptnPct
  const fatEnd = ptnEnd + fatPct
  const parts: string[] = []
  if (choEnd > 0) parts.push(`#3b82f6 0% ${choEnd}%`)
  if (ptnEnd > choEnd) parts.push(`#ef4444 ${choEnd}% ${ptnEnd}%`)
  if (fatEnd > ptnEnd) parts.push(`#eab308 ${ptnEnd}% ${fatEnd}%`)
  if (fatEnd < 100) parts.push(`#e8ece9 ${fatEnd}% 100%`)
  return `conic-gradient(${parts.join(', ')})`
}

export function PatientMealPlanNutritionSummary({
  liveTotals,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  nutritionGoals: _nutritionGoals,
  pdfLoading = false,
  onOpenFull,
  onOpenGoals,
  onExportPdf,
}: Props) {
  const totalKcal = liveTotals.caloriesKcal ?? 0
  const isEmpty = totalKcal <= 0

  const choKcal = (liveTotals.carbsG ?? 0) * 4
  const ptnKcal = (liveTotals.proteinG ?? 0) * 4
  const fatKcal = (liveTotals.fatG ?? 0) * 9

  const pct = (kcal: number) =>
    totalKcal > 0 ? Math.round((kcal / totalKcal) * 100) : 0

  const choPct = pct(choKcal)
  const ptnPct = pct(ptnKcal)
  const fatPct = pct(fatKcal)

  const gradient = buildDonutGradient(choPct, ptnPct, fatPct)
  const kcalLabel = isEmpty ? '—' : String(Math.round(totalKcal))

  const rows = [
    { id: 'cho', label: 'Carboidratos', tone: 'c', pct: choPct, grams: formatMacroGrams(liveTotals.carbsG), kcal: formatMacroKcal(choKcal) },
    { id: 'ptn', label: 'Proteínas',    tone: 'p', pct: ptnPct, grams: formatMacroGrams(liveTotals.proteinG), kcal: formatMacroKcal(ptnKcal) },
    { id: 'fat', label: 'Lipídios',     tone: 'f', pct: fatPct, grams: formatMacroGrams(liveTotals.fatG),    kcal: formatMacroKcal(fatKcal) },
  ]

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <h4 className={styles.title}>
          <ClipboardList size={15} aria-hidden="true" />
          Resumo nutricional
        </h4>
        <button
          type="button"
          className={`btn-secondary ${styles.headBtn}`}
          onClick={onOpenGoals}
        >
          <Target size={12} aria-hidden="true" />
          Metas
        </button>
      </header>

      <div className={styles.body}>
        {/* Donut */}
        <div className={`${styles.chartWrap} ${isEmpty ? styles.chartWrapEmpty : ''}`}>
          <div
            className={styles.donut}
            style={{ background: gradient }}
            aria-hidden="true"
          >
            <div className={styles.donutHole}>
              <span className={styles.donutKcal}>{kcalLabel}</span>
              <small className={styles.donutUnit}>Kcal</small>
            </div>
          </div>
          {isEmpty && (
            <p className={styles.hint}>
              Adicione alimentos às refeições para ver a distribuição de macros.
            </p>
          )}
        </div>

        {/* Macro rows */}
        {!isEmpty && (
          <ul className={styles.macros}>
            {rows.map((row) => (
              <li key={row.id} className={styles.macro}>
                <span className={`${styles.dot} ${styles[`dot${row.tone.toUpperCase() as 'C' | 'P' | 'F'}`]}`} aria-hidden="true" />
                <span className={styles.macroLabel}>{row.label}</span>
                <span className={styles.macroPct}>{row.pct}%</span>
                <span className={styles.macroValue}>
                  <strong>{row.grams}</strong>
                  <small>{row.kcal}</small>
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Action buttons */}
        <div className={styles.actions}>
          {onExportPdf && (
            <button
              type="button"
              className={`btn-secondary ${styles.actionBtn}`}
              disabled={isEmpty || pdfLoading}
              onClick={onExportPdf}
            >
              <FileDown size={14} aria-hidden="true" />
              {pdfLoading ? 'Gerando…' : 'PDF'}
            </button>
          )}
          <button
            type="button"
            className={`btn-secondary ${styles.actionBtn} ${onExportPdf ? '' : styles.actionBtnFull}`}
            disabled={isEmpty}
            onClick={onOpenFull}
          >
            <ClipboardList size={14} aria-hidden="true" />
            Resumo completo
          </button>
        </div>
      </div>
    </article>
  )
}
