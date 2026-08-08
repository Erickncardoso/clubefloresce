'use client'

import { useEffect, useMemo, useState } from 'react'
import { Cookie, Droplets, Dumbbell, Moon, Sparkles } from 'lucide-react'
import { fetchPatientGoals, type GoalItem, type GoalsProgress } from '@/lib/patient-chart/evolucao'
import {
  buildGoalsSummary,
  FOOD_WEEKDAYS,
  getFoodSelectedDays,
  getSleepSchedule,
  minutesToTimeLabel,
  weekdayIndex,
  type GoalRow,
} from '@/lib/patient-chart/goals-progress'
import styles from './PatientGoalsPanel.module.scss'

type NutritionTarget = {
  caloriesKcal?: number
  carbsG?: number
  proteinG?: number
  fatG?: number
}

type Props = {
  patientId: string
  nutritionTarget?: NutritionTarget | null
  compact?: boolean
  limit?: number
}

function goalIcon(goal: GoalItem) {
  if (goal.type === 'water') return Droplets
  if (goal.id === 'food') return Cookie
  if (goal.id === 'exercise') return Dumbbell
  if (goal.id === 'sleep') return Moon
  return Sparkles
}

function frequencyLabel(frequency?: string): string {
  return frequency === 'weekly' ? 'Semanal' : 'Diária'
}

function cardColorClass(goalId: string): string {
  if (goalId === 'water') return styles.cardWater
  if (goalId === 'food') return styles.cardFood
  if (goalId === 'exercise') return styles.cardExercise
  if (goalId === 'sleep') return styles.cardSleep
  return ''
}

/* ─── Inline mini-widgets ───────────────────────────────── */

function WaterWidget({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, target > 0 ? Math.round((current / target) * 100) : 0)
  return (
    <div className={styles.waterWidget}>
      <div className={styles.waterTrack}>
        <div className={styles.waterFill} style={{ height: `${pct}%` }} />
      </div>
      <span className={styles.widgetLabel}>
        {current} / {target} ml
      </span>
    </div>
  )
}

function FoodWidget({
  selectedDays,
  todayIndex,
}: {
  selectedDays: number[]
  todayIndex: number
}) {
  return (
    <div className={styles.foodWidget}>
      {FOOD_WEEKDAYS.map((wd) => (
        <div
          key={wd.index}
          className={[
            styles.foodDay,
            selectedDays.includes(wd.index) ? styles.foodDayDone : '',
            wd.index === todayIndex ? styles.foodDayToday : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.foodDayDot} />
          <span className={styles.foodDayLabel}>{wd.short}</span>
        </div>
      ))}
    </div>
  )
}

function ExerciseWidget({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, target > 0 ? Math.round((current / target) * 100) : 0)
  return (
    <div className={styles.exerciseWidget}>
      <div className={styles.exerciseTrack}>
        <div className={styles.exerciseFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.widgetLabel}>
        {current} / {target} sessões
      </span>
    </div>
  )
}

function SleepWidget({ bedMinutes, wakeMinutes, durationHours }: {
  bedMinutes: number
  wakeMinutes: number
  durationHours: number
}) {
  return (
    <div className={styles.sleepWidget}>
      <div className={styles.sleepRow}>
        <span className={styles.sleepIcon}>🌙</span>
        <span className={styles.sleepTime}>{minutesToTimeLabel(bedMinutes)}</span>
        <span className={styles.sleepArrow}>→</span>
        <span className={styles.sleepIcon}>☀️</span>
        <span className={styles.sleepTime}>{minutesToTimeLabel(wakeMinutes)}</span>
      </div>
      <span className={styles.widgetLabel}>{durationHours}h de sono</span>
    </div>
  )
}

function GenericWidget({ current, target, unit }: { current: number; target: number; unit?: string }) {
  return (
    <div className={styles.genericWidget}>
      <span className={styles.genericValue}>
        {current} / {target} {unit || ''}
      </span>
    </div>
  )
}

function GoalWidget({
  row,
  foodSelectedDays,
  todayWdIndex,
  progress,
}: {
  row: GoalRow
  foodSelectedDays: number[]
  todayWdIndex: number
  progress: GoalsProgress
}) {
  const { goal } = row
  if (goal.type === 'water') {
    return <WaterWidget current={row.progress} target={goal.target || 0} />
  }
  if (goal.id === 'food') {
    return <FoodWidget selectedDays={foodSelectedDays} todayIndex={todayWdIndex} />
  }
  if (goal.id === 'exercise') {
    return <ExerciseWidget current={row.progress} target={goal.target || 0} />
  }
  if (goal.id === 'sleep') {
    const schedule = getSleepSchedule(progress)
    return (
      <SleepWidget
        bedMinutes={schedule.bedMinutes}
        wakeMinutes={schedule.wakeMinutes}
        durationHours={schedule.durationHours}
      />
    )
  }
  return <GenericWidget current={row.progress} target={goal.target || 0} unit={goal.unit} />
}

/* ─── Main component ─────────────────────────────────────── */

export function PatientGoalsPanel({
  patientId,
  nutritionTarget,
  compact = false,
  limit = 0,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [progress, setProgress] = useState<GoalsProgress>({})

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchPatientGoals(patientId)
      .then((data) => {
        setGoals(data.goals)
        setProgress(data.progress)
      })
      .catch((err) => {
        setError(
          (err as { message?: string })?.message || 'Não foi possível carregar as metas.',
        )
        setGoals([])
        setProgress({})
      })
      .finally(() => setLoading(false))
  }, [patientId])

  const goalRows = useMemo(() => buildGoalsSummary(goals, progress), [goals, progress])

  const visibleGoalRows = useMemo(
    () => (compact && limit > 0 ? goalRows.slice(0, limit) : goalRows),
    [goalRows, compact, limit],
  )

  const foodGoal = useMemo(() => goals.find((g) => g.id === 'food') || null, [goals])
  const foodSelectedDays = useMemo(
    () => getFoodSelectedDays(foodGoal, progress),
    [foodGoal, progress],
  )
  const todayWdIndex = useMemo(() => weekdayIndex(), [])

  if (loading) return <div className={styles.state}>Carregando metas…</div>
  if (error) return <p className={`${styles.state} ${styles.stateError}`}>{error}</p>
  if (!goalRows.length)
    return <p className={styles.state}>A paciente ainda não registrou metas no app.</p>

  return (
    <div className={`${styles.root} ${compact ? styles.compact : ''}`}>
      <div className={styles.goals}>
        {visibleGoalRows.map((row) => {
          const Icon = goalIcon(row.goal)
          return (
            <article
              key={row.goal.id}
              className={[styles.card, cardColorClass(row.goal.id)].filter(Boolean).join(' ')}
            >
              <header className={styles.head}>
                <div className={styles.headCopy}>
                  <span className={styles.icon} aria-hidden>
                    <Icon size={16} />
                  </span>
                  <div>
                    <h3>{row.goal.label}</h3>
                    <p className={styles.meta}>
                      {row.goal.id === 'food' ? (
                        <>
                          Semanal ·{' '}
                          {row.progress === 1
                            ? '1 dia registrado'
                            : `${row.progress} dias registrados`}
                        </>
                      ) : (
                        <>
                          {frequencyLabel(row.goal.frequency)} · {row.progress} / {row.goal.target}{' '}
                          {row.goal.unit}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <span className={`${styles.pct} ${row.goal.id === 'food' ? styles.pctCount : ''}`}>
                  {row.goal.id === 'food' ? row.progress : `${row.percent}%`}
                </span>
              </header>

              <div className={styles.surface}>
                <div className={styles.widget}>
                  <GoalWidget
                    row={row}
                    foodSelectedDays={foodSelectedDays}
                    todayWdIndex={todayWdIndex}
                    progress={progress}
                  />
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {nutritionTarget && !compact && (
        <article className={styles.targetsCard}>
          <h4>Metas nutricionais (diário)</h4>
          <div className={styles.targetsGrid}>
            <span>
              <strong>{nutritionTarget.caloriesKcal}</strong> kcal
            </span>
            <span>C {nutritionTarget.carbsG}g</span>
            <span>P {nutritionTarget.proteinG}g</span>
            <span>G {nutritionTarget.fatG}g</span>
          </div>
        </article>
      )}
    </div>
  )
}
