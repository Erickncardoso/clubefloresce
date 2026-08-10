'use client'

import { useEffect, useState } from 'react'
import { Calculator, ChevronRight, Target, X } from 'lucide-react'
import {
  MacroGoalsDraft,
  MacroGoalsSaveResult,
  MacroGoalType,
  caloriesFromMacroGrams,
  gramsFromMacroPercents,
  gramsFromPerKg,
  hydrateMacroGoalsDraft,
  macroGoalTypeLabel,
  macroPercentTotal,
  normalizeMacroGoalsForSave,
  percentsFromMacroGrams,
  perKgFromMacroGrams,
  roundMacroGoal,
} from '@/lib/meal-plan/nutrition-goals'
import type { MacroTotals } from '@/lib/meal-plan/types'
import { AnimatedDialog } from '@/components/overlays'
import styles from './PatientMealPlanNutritionGoalsModal.module.scss'

const GOAL_TYPE_OPTIONS: Array<{ id: MacroGoalType; label: string }> = [
  { id: 'general', label: 'Gramas' },
  { id: 'percent', label: 'Percentual' },
  { id: 'per_kg', label: 'Por peso' },
]

interface Props {
  open: boolean
  goals: Partial<MacroTotals> | null | undefined
  liveTotals: MacroTotals | null | undefined
  patientWeightKg?: number | null
  onClose: () => void
  onSave: (result: MacroGoalsSaveResult) => void
}

function useDraft(open: boolean, goals: Props['goals'], patientWeightKg: number | null | undefined): [MacroGoalsDraft, React.Dispatch<React.SetStateAction<MacroGoalsDraft>>] {
  const [draft, setDraft] = useState<MacroGoalsDraft>(() => hydrateMacroGoalsDraft(goals, { weightKg: patientWeightKg ?? null }))

  useEffect(() => {
    if (open) {
      setDraft(hydrateMacroGoalsDraft(goals, { weightKg: patientWeightKg ?? null }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return [draft, setDraft]
}

export function PatientMealPlanNutritionGoalsModal({ open, goals, liveTotals, patientWeightKg, onClose, onSave }: Props) {
  const [draft, setDraft] = useDraft(open, goals, patientWeightKg)

  function updateDraft(patch: Partial<MacroGoalsDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  const weightKg = typeof patientWeightKg === 'number' && patientWeightKg > 0 ? patientWeightKg : null

  const computedGrams = (() => {
    if (draft.goalType === 'percent') {
      return gramsFromMacroPercents(draft.caloriesKcal, { proteinPct: draft.proteinPct, carbsPct: draft.carbsPct, fatPct: draft.fatPct })
    }
    if (draft.goalType === 'per_kg') {
      return { ...gramsFromPerKg(weightKg, { proteinGPerKg: draft.proteinGPerKg, carbsGPerKg: draft.carbsGPerKg, fatGPerKg: draft.fatGPerKg }), caloriesKcal: 0 }
    }
    return {
      proteinG: Number(draft.proteinG) || 0,
      carbsG: Number(draft.carbsG) || 0,
      fatG: Number(draft.fatG) || 0,
      caloriesKcal: draft.includeCalories
        ? Math.round(Number(draft.caloriesKcal) || 0)
        : caloriesFromMacroGrams(draft),
    }
  })()

  const macroHints = (() => {
    if (draft.goalType === 'percent' || draft.goalType === 'per_kg') {
      return {
        carbs: `≈ ${roundMacroGoal(computedGrams.carbsG)} g`,
        protein: `≈ ${roundMacroGoal(computedGrams.proteinG)} g`,
        fat: `≈ ${roundMacroGoal(computedGrams.fatG)} g`,
      }
    }
    if (draft.goalType === 'general') {
      const kcal = Number(draft.caloriesKcal) || caloriesFromMacroGrams(draft)
      const pct = percentsFromMacroGrams(kcal, draft)
      return {
        carbs: kcal ? `≈ ${pct.carbsPct}% do VET` : '',
        protein: kcal ? `≈ ${pct.proteinPct}% do VET` : '',
        fat: kcal ? `≈ ${pct.fatPct}% do VET` : '',
      }
    }
    return { carbs: '', protein: '', fat: '' }
  })()

  const macroLabels = (() => {
    if (draft.goalType === 'percent') return { carbs: 'Carboidratos (%)', protein: 'Proteínas (%)', fat: 'Lipídios (%)' }
    if (draft.goalType === 'per_kg') return { carbs: 'Carboidratos (g/kg)', protein: 'Proteínas (g/kg)', fat: 'Lipídios (g/kg)' }
    return { carbs: 'Carboidratos (g)', protein: 'Proteínas (g)', fat: 'Lipídios (g)' }
  })()

  const percentTotal = macroPercentTotal({ proteinPct: draft.proteinPct, carbsPct: draft.carbsPct, fatPct: draft.fatPct })

  const generalCaloriesHint = draft.goalType === 'general' && !draft.includeCalories
    ? `Calculado dos macros: ${caloriesFromMacroGrams(draft)} kcal`
    : ''

  const energySummary = (() => {
    const kcal = draft.goalType === 'percent'
      ? Math.round(Number(draft.caloriesKcal) || 0)
      : (computedGrams.caloriesKcal || caloriesFromMacroGrams(computedGrams))
    if (!kcal) return 'Defina as metas para ver o valor energético'
    return `${kcal} kcal · ${macroGoalTypeLabel(draft.goalType)}`
  })()

  function setGoalType(nextType: MacroGoalType) {
    if (draft.goalType === nextType) return
    const kcal = Number(draft.caloriesKcal) || caloriesFromMacroGrams(draft)
    const grams = {
      proteinG: Number(draft.proteinG) || computedGrams.proteinG || 0,
      carbsG: Number(draft.carbsG) || computedGrams.carbsG || 0,
      fatG: Number(draft.fatG) || computedGrams.fatG || 0,
    }
    const percents = percentsFromMacroGrams(kcal, grams)
    const perKg = perKgFromMacroGrams(weightKg, grams)
    setDraft((prev) => ({
      ...prev,
      goalType: nextType,
      caloriesKcal: kcal || prev.caloriesKcal,
      ...grams,
      ...percents,
      ...perKg,
    }))
  }

  function applyLiveTotals() {
    const block = liveTotals
    if (!block) return
    const caloriesKcal = Math.round(Number(block.caloriesKcal) || 0) || ''
    const proteinG = roundMacroGoal(block.proteinG) ?? ''
    const carbsG = roundMacroGoal(block.carbsG) ?? ''
    const fatG = roundMacroGoal(block.fatG) ?? ''
    const pct = percentsFromMacroGrams(Number(caloriesKcal), { proteinG: Number(proteinG), carbsG: Number(carbsG), fatG: Number(fatG) })
    const perKg = perKgFromMacroGrams(weightKg, { proteinG: Number(proteinG), carbsG: Number(carbsG), fatG: Number(fatG) })
    setDraft((prev) => ({
      ...prev,
      includeCalories: true,
      caloriesKcal,
      proteinG,
      carbsG,
      fatG,
      ...pct,
      ...perKg,
    }))
  }

  function handleSave() {
    onSave(normalizeMacroGoalsForSave(draft, { weightKg }))
    onClose()
  }

  const goalTypeHint = (() => {
    if (draft.goalType === 'percent') return 'Informe o VET e a distribuição percentual — convertemos para gramas automaticamente.'
    if (draft.goalType === 'per_kg') return weightKg ? `Metas proporcionais ao peso (${weightKg} kg).` : 'Metas em g/kg de peso corporal.'
    return 'Informe proteínas, carboidratos e gorduras em gramas.'
  })()

  return (
    <AnimatedDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Metas Nutricionais"
      contentClassName={styles.panel}
    >
      <header className={styles.head}>
        <div className={styles.titleWrap}>
          <Target className={styles.icon} aria-hidden="true" />
          <h2 id="mpng-title">Metas Nutricionais</h2>
        </div>
        <button type="button" className={styles.closeBtn} aria-label="Fechar" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </header>

      <div className={styles.body}>
          {/* Goal type segment */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Tipo de meta</span>
            <div className={styles.segment} role="group" aria-label="Tipo de meta">
              {GOAL_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles.segmentBtn} ${draft.goalType === opt.id ? styles.segmentBtnActive : ''}`}
                  onClick={() => setGoalType(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className={styles.fieldHint}>{goalTypeHint}</p>
          </div>

          {/* Calories (percent mode) */}
          {draft.goalType === 'percent' && (
            <div className={`field field--float ${styles.macroField} ${styles.macroFieldKcal}`}>
              <label htmlFor="mpng-kcal-pct">Valor energético total (kcal)</label>
              <input
                id="mpng-kcal-pct"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={draft.caloriesKcal}
                onChange={(e) => updateDraft({ caloriesKcal: e.target.value === '' ? '' : Number(e.target.value) })}
              />
            </div>
          )}

          {/* Macros grid */}
          <div className={styles.macros}>
            {/* Carbs */}
            <div className={`field field--float ${styles.macroField}`}>
              <label htmlFor="mpng-carbs">{macroLabels.carbs}</label>
              {draft.goalType === 'percent' ? (
                <input id="mpng-carbs" type="number" min={0} step={0.1} inputMode="decimal" value={draft.carbsPct} onChange={(e) => updateDraft({ carbsPct: e.target.value === '' ? '' : Number(e.target.value) })} />
              ) : draft.goalType === 'per_kg' ? (
                <input id="mpng-carbs" type="number" min={0} step={0.1} inputMode="decimal" value={draft.carbsGPerKg} onChange={(e) => updateDraft({ carbsGPerKg: e.target.value === '' ? '' : Number(e.target.value) })} />
              ) : (
                <input id="mpng-carbs" type="number" min={0} step={0.1} inputMode="decimal" value={draft.carbsG} onChange={(e) => updateDraft({ carbsG: e.target.value === '' ? '' : Number(e.target.value) })} />
              )}
              {macroHints.carbs && <small className={styles.macroHint}>{macroHints.carbs}</small>}
            </div>

            {/* Protein */}
            <div className={`field field--float ${styles.macroField}`}>
              <label htmlFor="mpng-protein">{macroLabels.protein}</label>
              {draft.goalType === 'percent' ? (
                <input id="mpng-protein" type="number" min={0} step={0.1} inputMode="decimal" value={draft.proteinPct} onChange={(e) => updateDraft({ proteinPct: e.target.value === '' ? '' : Number(e.target.value) })} />
              ) : draft.goalType === 'per_kg' ? (
                <input id="mpng-protein" type="number" min={0} step={0.1} inputMode="decimal" value={draft.proteinGPerKg} onChange={(e) => updateDraft({ proteinGPerKg: e.target.value === '' ? '' : Number(e.target.value) })} />
              ) : (
                <input id="mpng-protein" type="number" min={0} step={0.1} inputMode="decimal" value={draft.proteinG} onChange={(e) => updateDraft({ proteinG: e.target.value === '' ? '' : Number(e.target.value) })} />
              )}
              {macroHints.protein && <small className={styles.macroHint}>{macroHints.protein}</small>}
            </div>

            {/* Fat */}
            <div className={`field field--float ${styles.macroField}`}>
              <label htmlFor="mpng-fat">{macroLabels.fat}</label>
              {draft.goalType === 'percent' ? (
                <input id="mpng-fat" type="number" min={0} step={0.1} inputMode="decimal" value={draft.fatPct} onChange={(e) => updateDraft({ fatPct: e.target.value === '' ? '' : Number(e.target.value) })} />
              ) : draft.goalType === 'per_kg' ? (
                <input id="mpng-fat" type="number" min={0} step={0.1} inputMode="decimal" value={draft.fatGPerKg} onChange={(e) => updateDraft({ fatGPerKg: e.target.value === '' ? '' : Number(e.target.value) })} />
              ) : (
                <input id="mpng-fat" type="number" min={0} step={0.1} inputMode="decimal" value={draft.fatG} onChange={(e) => updateDraft({ fatG: e.target.value === '' ? '' : Number(e.target.value) })} />
              )}
              {macroHints.fat && <small className={styles.macroHint}>{macroHints.fat}</small>}
            </div>

            {/* Calories (general mode) */}
            {draft.goalType === 'general' && (
              <div className={`field field--float ${styles.macroField} ${styles.macroFieldKcal}`}>
                <div className={styles.kcalHead}>
                  <label htmlFor="mpng-kcal">Calorias</label>
                  <label className={styles.kcalCheck}>
                    <input type="checkbox" checked={draft.includeCalories} onChange={(e) => updateDraft({ includeCalories: e.target.checked })} />
                    <span>Incluir</span>
                  </label>
                </div>
                <input
                  id="mpng-kcal"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  disabled={!draft.includeCalories}
                  value={draft.caloriesKcal}
                  onChange={(e) => updateDraft({ caloriesKcal: e.target.value === '' ? '' : Number(e.target.value) })}
                />
                {generalCaloriesHint && <small className={styles.macroHint}>{generalCaloriesHint}</small>}
              </div>
            )}
          </div>

          {draft.goalType === 'percent' && (
            <p className={`${styles.pctTotal} ${percentTotal !== 100 ? styles.pctTotalWarn : ''}`}>
              Total distribuído: {percentTotal}%
              {percentTotal !== 100 && <span> · ideal: 100%</span>}
            </p>
          )}

          {draft.goalType === 'per_kg' && !weightKg && (
            <p className={styles.weightWarn}>Informe o peso da paciente na antropometria para calcular as metas em gramas.</p>
          )}

          <div className={styles.energy}>
            <span>{energySummary}</span>
            {liveTotals && (
              <button type="button" className={styles.energyBtn} onClick={applyLiveTotals}>
                <Calculator aria-hidden="true" />
                Usar totais do plano
              </button>
            )}
          </div>
        </div>

      <footer className={styles.foot}>
        <button type="button" className={styles.microLink} disabled>
          <Target aria-hidden="true" />
          Metas de micronutrientes
          <ChevronRight aria-hidden="true" />
        </button>
        <div className={styles.footActions}>
          <button type="button" className={`btn-secondary ${styles.footBtn}`} onClick={onClose}>Cancelar</button>
          <button type="button" className={`btn-primary ${styles.footBtn}`} onClick={handleSave}>Salvar</button>
        </div>
      </footer>
    </AnimatedDialog>
  )
}
