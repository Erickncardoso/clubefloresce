'use client'

import { Droplets } from 'lucide-react'
import {
  computeHydrationGoal,
  countRemindersInWindow,
  formatHydrationAmount,
  formatHydrationCups,
  hydrationPerReminder,
  normalizeHydrationPrescription,
} from '@/lib/meal-plan/hydration'
import type { HydrationPrescription } from '@/lib/meal-plan/hydration'
import styles from './PatientMealPlanHydrationCard.module.scss'

interface Props {
  prescription: Partial<HydrationPrescription> | null | undefined
  onEdit: () => void
}

export function PatientMealPlanHydrationCard({ prescription, onEdit }: Props) {
  const normalized = normalizeHydrationPrescription(prescription)
  const goalMl = computeHydrationGoal(normalized)
  const hasPrescription = Boolean(prescription && (goalMl > 0 || normalized.notes))

  const formattedGoal = formatHydrationAmount(goalMl, normalized.unit)
  const scheduleLabel = normalized.scheduleMode === 'daily' ? 'Prescrição diária' : 'Prescrição semanal'

  let intervalLine = ''
  if (hasPrescription && normalized.useConsumptionWindow) {
    const perReminder = hydrationPerReminder(goalMl, normalized.wakeTime, normalized.bedTime, normalized.intervalHours)
    if (perReminder > 0) {
      const cups = formatHydrationCups(perReminder)
      const amount = formatHydrationAmount(perReminder, normalized.unit)
      intervalLine = `Lembretes: ${amount} · ${cups}`
    }
  }

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <h4 className={styles.title}>
          <Droplets size={14} aria-hidden="true" />
          Hidratação
        </h4>
        {hasPrescription && (
          <button
            type="button"
            className={`btn-secondary ${styles.editBtn}`}
            onClick={onEdit}
          >
            Editar
          </button>
        )}
      </header>

      {!hasPrescription ? (
        <>
          <p className={styles.empty}>
            Sem meta de hidratação. Calculamos a partir do peso, altura, atividade e clima da paciente.
          </p>
          <button type="button" className={`btn-secondary ${styles.btn}`} onClick={onEdit}>
            <Droplets size={14} aria-hidden="true" />
            Prescrever hidratação
          </button>
        </>
      ) : (
        <>
          <p className={styles.goal}>
            {formattedGoal}
            <span>por dia</span>
          </p>
          <ul className={styles.metaList}>
            <li>{scheduleLabel}</li>
            {intervalLine && <li>{intervalLine}</li>}
          </ul>
          <button type="button" className={`btn-secondary ${styles.btn}`} onClick={onEdit}>
            Ver prescrição
          </button>
        </>
      )}
    </article>
  )
}
