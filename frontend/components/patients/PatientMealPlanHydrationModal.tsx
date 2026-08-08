'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info, X } from 'lucide-react'
import {
  HYDRATION_ACTIVITY_LEVELS,
  HYDRATION_DAY_IDS,
  HYDRATION_SCHEDULE_MODES,
  HYDRATION_UNIT_OPTIONS,
  HydrationPrescription,
  computeHydrationBreakdown,
  computeHydrationGoal,
  formatHydrationAmount,
  formatHydrationCups,
  hasManualHydrationOverride,
  hydrationPerReminder,
  normalizeHydrationPrescription,
} from '@/lib/meal-plan/hydration'
import styles from './PatientMealPlanHydrationModal.module.scss'

interface Props {
  open: boolean
  prescription: Partial<HydrationPrescription> | null | undefined
  planTitle?: string
  patientWeightKg?: number | null
  patientHeightCm?: number | null
  onClose: () => void
  onSave: (prescription: HydrationPrescription) => void
}

function useDraft(open: boolean, props: Props): [HydrationPrescription, React.Dispatch<React.SetStateAction<HydrationPrescription>>] {
  const init = () => normalizeHydrationPrescription(props.prescription, {
    weightKg: props.patientWeightKg ?? null,
    heightCm: props.patientHeightCm ?? null,
    title: props.prescription?.title || props.planTitle || '',
  })

  const [draft, setDraft] = useState<HydrationPrescription>(init)

  useEffect(() => {
    if (open) setDraft(init())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return [draft, setDraft]
}

export function PatientMealPlanHydrationModal({ open, prescription, planTitle, patientWeightKg, patientHeightCm, onClose, onSave }: Props) {
  const [draft, setDraft] = useDraft(open, { open, prescription, planTitle, patientWeightKg, patientHeightCm, onClose, onSave })
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  function updateDraft(patch: Partial<HydrationPrescription>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  const breakdown = computeHydrationBreakdown(draft)
  const computedDailyMl = breakdown.totalMl
  const dailyMl = computeHydrationGoal(draft, draft.activeDay)
  const formattedDaily = formatHydrationAmount(dailyMl, draft.unit)
  const formattedComputedDaily = formatHydrationAmount(computedDailyMl, draft.unit)

  const visibleDayTabs = draft.scheduleMode === 'daily'
    ? HYDRATION_DAY_IDS.filter((d) => d.id !== 'all')
    : HYDRATION_DAY_IDS.filter((d) => d.id === 'all')

  const intervalMl = (() => {
    if (!draft.useConsumptionWindow) {
      return Math.round((dailyMl || 0) / Math.max(1, Math.ceil(24 / (Number(draft.intervalHours) || 2))))
    }
    return hydrationPerReminder(dailyMl, draft.wakeTime, draft.bedTime, draft.intervalHours)
  })()

  const formattedInterval = formatHydrationAmount(intervalMl, draft.unit)
  const intervalPreviewCups = (draft.useConsumptionWindow && intervalMl) ? formatHydrationCups(intervalMl) : ''
  const showUndo = hasManualHydrationOverride(draft, computedDailyMl)

  const displayDailyAmount = (() => {
    if (draft.scheduleMode === 'daily' && draft.activeDay !== 'all') {
      const perDay = draft.dailyGoals?.[draft.activeDay]
      if (perDay != null && Number(perDay) > 0) {
        return draft.unit === 'l' ? Number(perDay) / 1000 : Number(perDay)
      }
    }
    if (draft.customDailyMl != null && draft.customDailyMl > 0) {
      return draft.unit === 'l' ? draft.customDailyMl / 1000 : draft.customDailyMl
    }
    return draft.unit === 'l' ? computedDailyMl / 1000 : computedDailyMl
  })()

  function onDailyAmountInput(e: React.ChangeEvent<HTMLInputElement>) {
    const num = Number(e.target.value)
    const ml = Number.isFinite(num) && num > 0
      ? (draft.unit === 'l' ? Math.round(num * 1000) : Math.round(num))
      : null
    if (draft.scheduleMode === 'daily' && draft.activeDay !== 'all') {
      const nextGoals = { ...draft.dailyGoals }
      if (ml == null) delete nextGoals[draft.activeDay]
      else nextGoals[draft.activeDay] = ml
      setDraft((prev) => ({ ...prev, dailyGoals: nextGoals, manualOverride: true }))
      return
    }
    setDraft((prev) => ({ ...prev, customDailyMl: ml, manualOverride: true }))
  }

  function undoManualOverride() {
    const nextGoals = { ...draft.dailyGoals }
    if (draft.scheduleMode === 'daily' && draft.activeDay !== 'all') delete nextGoals[draft.activeDay]
    setDraft((prev) => ({ ...prev, manualOverride: false, customDailyMl: null, dailyGoals: nextGoals }))
  }

  function setScheduleMode(mode: 'weekly' | 'daily') {
    setDraft((prev) => ({
      ...prev,
      scheduleMode: mode,
      activeDay: mode === 'weekly' ? 'all' : (prev.activeDay === 'all' ? 'mon' : prev.activeDay),
    }))
  }

  function setHotHumidClimate(value: boolean) {
    setDraft((prev) => ({ ...prev, hotHumidClimate: value, climate: value ? 'warm' : 'mild' }))
  }

  function handleSave() {
    onSave(normalizeHydrationPrescription({ ...draft }))
    onClose()
  }

  function formatBreakdown(ml: number): string {
    return formatHydrationAmount(ml, draft.unit)
  }

  if (!mounted || !open) return null

  const activityOptions = HYDRATION_ACTIVITY_LEVELS.map((item) => ({ value: item.id, label: item.label }))

  return createPortal(
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="mph-title">
      <div className={styles.backdrop} aria-hidden="true" onClick={onClose} />
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className={styles.head}>
          <label className={styles.titleField}>
            <span className={styles.titleSr}>Título da prescrição</span>
            <input
              type="text"
              className={styles.titleInput}
              value={draft.title}
              placeholder="Título da prescrição"
              maxLength={120}
              autoComplete="off"
              onChange={(e) => updateDraft({ title: e.target.value })}
            />
          </label>
          <button type="button" className={styles.closeBtn} aria-label="Fechar" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        {/* Schedule mode */}
        <div className={styles.mode}>
          <span className={styles.modeLabel}>Prescrição</span>
          <div className={styles.segment} role="group" aria-label="Modo de prescrição">
            {HYDRATION_SCHEDULE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`${styles.segBtn} ${draft.scheduleMode === mode.id ? styles.segBtnActive : ''}`}
                onClick={() => setScheduleMode(mode.id as 'weekly' | 'daily')}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Day tabs */}
        <div className={styles.days} role="tablist" aria-label="Dias da semana">
          {visibleDayTabs.map((day) => (
            <button
              key={day.id}
              type="button"
              role="tab"
              className={`${styles.dayTab} ${draft.activeDay === day.id ? styles.dayTabActive : ''}`}
              aria-selected={draft.activeDay === day.id}
              onClick={() => updateDraft({ activeDay: day.id })}
            >
              {day.label}
            </button>
          ))}
        </div>

        {/* Layout */}
        <div className={styles.layout}>
          {/* Form */}
          <section className={styles.form} aria-label="Meta hídrica">
            <div className={styles.sectionHead}>
              <h2 id="mph-title" className={styles.sectionTitle}>
                💧 Meta hídrica
              </h2>
            </div>

            <div className={styles.formRow}>
              <div className={`field field--float ${styles.fieldSuffix}`}>
                <label htmlFor="mph-weight">Peso</label>
                <input
                  id="mph-weight"
                  type="number"
                  min={0}
                  step={0.1}
                  inputMode="decimal"
                  value={draft.weightKg ?? ''}
                  onChange={(e) => updateDraft({ weightKg: e.target.value ? Number(e.target.value) : null })}
                />
                <span className={styles.suffix}>kg</span>
              </div>
              <div className={`field field--float ${styles.fieldSuffix}`}>
                <label htmlFor="mph-height">Altura</label>
                <input
                  id="mph-height"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={draft.heightCm ?? ''}
                  onChange={(e) => updateDraft({ heightCm: e.target.value ? Number(e.target.value) : null })}
                />
                <span className={styles.suffix}>cm</span>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className="field field--float">
                <label htmlFor="mph-activity">Atividade física</label>
                <select
                  id="mph-activity"
                  value={draft.activityLevel}
                  onChange={(e) => {
                    const level = e.target.value
                    updateDraft({ activityLevel: level, activityDurationMin: level === 'sedentary' ? null : draft.activityDurationMin })
                  }}
                >
                  {activityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className={`field field--float ${styles.fieldSuffix} ${draft.activityLevel === 'sedentary' ? styles.fieldDisabled : ''}`}>
                <label htmlFor="mph-duration">Duração</label>
                <input
                  id="mph-duration"
                  type="number"
                  min={0}
                  step={5}
                  inputMode="numeric"
                  placeholder="—"
                  disabled={draft.activityLevel === 'sedentary'}
                  value={draft.activityDurationMin ?? ''}
                  onChange={(e) => updateDraft({ activityDurationMin: e.target.value ? Number(e.target.value) : null })}
                />
                <span className={styles.suffix}>min</span>
              </div>
            </div>

            {/* Hot climate */}
            <div className={styles.climate}>
              <div className={styles.climateCopy}>
                <strong>Clima quente/úmido?</strong>
                <span>Temperatura &gt;30 °C ou umidade &gt;70%</span>
              </div>
              <div className={styles.segment} role="group" aria-label="Clima quente ou úmido">
                <button
                  type="button"
                  className={`${styles.segBtn} ${!draft.hotHumidClimate ? styles.segBtnActive : ''}`}
                  onClick={() => setHotHumidClimate(false)}
                >
                  Não
                </button>
                <button
                  type="button"
                  className={`${styles.segBtn} ${draft.hotHumidClimate ? styles.segBtnActive : ''}`}
                  onClick={() => setHotHumidClimate(true)}
                >
                  Sim
                </button>
              </div>
            </div>

            {/* Interval */}
            <div className={styles.interval}>
              <div className={styles.intervalHead}>
                <label className={styles.intervalLabel}>
                  <input
                    type="checkbox"
                    checked={draft.useConsumptionWindow}
                    onChange={(e) => updateDraft({ useConsumptionWindow: e.target.checked })}
                  />
                  <span>Intervalo de consumo</span>
                </label>
                <span className={styles.intervalInfoHint} title="Define horários de acordar/dormir para calcular lembretes">
                  <Info aria-hidden="true" />
                </span>
              </div>
              <div className={`${styles.intervalGrid} ${!draft.useConsumptionWindow ? styles.intervalGridDisabled : ''}`}>
                <div className="field field--float">
                  <label htmlFor="mph-wake">Início</label>
                  <input id="mph-wake" type="time" disabled={!draft.useConsumptionWindow} value={draft.wakeTime} onChange={(e) => updateDraft({ wakeTime: e.target.value })} />
                </div>
                <div className="field field--float">
                  <label htmlFor="mph-bed">Término</label>
                  <input id="mph-bed" type="time" disabled={!draft.useConsumptionWindow} value={draft.bedTime} onChange={(e) => updateDraft({ bedTime: e.target.value })} />
                </div>
                <div className={`field field--float ${styles.fieldSuffix}`}>
                  <label htmlFor="mph-interval-h">A cada</label>
                  <input
                    id="mph-interval-h"
                    type="number"
                    min={1}
                    max={12}
                    step={1}
                    inputMode="numeric"
                    disabled={!draft.useConsumptionWindow}
                    value={draft.intervalHours}
                    onChange={(e) => updateDraft({ intervalHours: Number(e.target.value) || 2 })}
                  />
                  <span className={styles.suffix}>h</span>
                </div>
              </div>
              {draft.useConsumptionWindow && intervalPreviewCups && (
                <p className={styles.intervalPreview}>
                  ≈ {intervalPreviewCups} por lembrete
                  <span> (janela {draft.wakeTime}–{draft.bedTime})</span>
                </p>
              )}
            </div>

            {/* Units */}
            <div className={styles.units}>
              <span className={styles.unitsLabel}>Medida</span>
              <div className={styles.segment} role="group" aria-label="Unidade de medida">
                {HYDRATION_UNIT_OPTIONS.map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    className={`${styles.segBtn} ${draft.unit === unit.id ? styles.segBtnActive : ''}`}
                    onClick={() => updateDraft({ unit: unit.id })}
                  >
                    {unit.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className={styles.quantity}>
              <div className={`field field--float ${styles.fieldSuffix} ${styles.quantityField}`}>
                <label htmlFor="mph-custom">Quantidade de água</label>
                <input
                  id="mph-custom"
                  type="number"
                  min={0}
                  step={50}
                  inputMode="numeric"
                  placeholder={formattedComputedDaily}
                  value={displayDailyAmount || ''}
                  onChange={onDailyAmountInput}
                />
                <span className={styles.suffix}>{draft.unit}</span>
              </div>
              {showUndo && (
                <button type="button" className={`btn-secondary ${styles.undoBtn}`} onClick={undoManualOverride}>
                  Desfazer
                </button>
              )}
            </div>

            {/* Notes */}
            <div className="field field--float">
              <label htmlFor="mph-notes">Observações</label>
              <textarea
                id="mph-notes"
                rows={3}
                placeholder="Orientações adicionais para a paciente"
                value={draft.notes}
                onChange={(e) => updateDraft({ notes: e.target.value })}
              />
            </div>
          </section>

          {/* Preview card */}
          <aside className={styles.preview} aria-label="Resumo da prescrição">
            <header className={styles.previewHead}>
              <span>💧</span>
              <span>Prescrição de Hidratação</span>
            </header>

            <div className={styles.previewBlock}>
              <p className={styles.previewBlockLabel}>Meta hídrica</p>
              <p className={styles.previewBlockValue}>
                {formattedDaily}<span>/dia</span>
              </p>
              <ul className={styles.previewBreakdown}>
                <li>+ {formatBreakdown(breakdown.baseMl)} (base)</li>
                <li>+ {formatBreakdown(breakdown.activityBonusMl)} ({breakdown.activityLabel})</li>
                <li>+ {formatBreakdown(breakdown.climateBonusMl)} ({breakdown.climateLabel})</li>
              </ul>
            </div>

            <div className={`${styles.previewBlock} ${styles.previewBlockInterval}`}>
              <div>
                <span className={styles.intervalLabel2}>A cada {draft.intervalHours || 2} horas</span>
                {intervalPreviewCups && <small className={styles.intervalCups}>{intervalPreviewCups}</small>}
              </div>
              <strong className={styles.intervalValue}>{formattedInterval}</strong>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className={styles.foot}>
          <button type="button" className={`btn-secondary ${styles.footBtn}`} onClick={onClose}>Cancelar</button>
          <button type="button" className={`btn-primary ${styles.footBtnSave}`} onClick={handleSave}>Salvar</button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
