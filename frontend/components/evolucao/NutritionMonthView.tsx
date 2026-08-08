'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  fetchFoodDiaryDay,
  fetchFoodDiaryMonth,
  type DayEntry,
  type MonthDaySummary,
  type MonthSummary,
} from '@/lib/patient-chart/evolucao'
import styles from './NutritionMonthView.module.scss'

type Props = {
  patientId: string
  compact?: boolean
}

const now = new Date()

function todayKey(): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dayNumber(dateKey: string): number {
  return Number(dateKey.slice(8, 10))
}

function barHeight(day: MonthDaySummary, target: number): number {
  if (!day.entryCount) return 8
  return Math.max(12, Math.min(100, Math.round((day.consumed.caloriesKcal / target) * 100)))
}

function barColor(day: MonthDaySummary, target: number): string {
  if (!day.entryCount) return 'var(--cf-track, #e5e7eb)'
  const pct = barHeight(day, target)
  if (pct >= 100) return '#c4842e'
  if (pct >= 70) return 'var(--cf-green, #4caf50)'
  return '#5ba4d9'
}

function dayTip(day: MonthDaySummary, target: number): string {
  if (!day.entryCount) return 'Sem registro neste dia'
  const pct = Math.round((day.consumed.caloriesKcal / target) * 100)
  return `${day.consumed.caloriesKcal} kcal (${pct}% da meta) · ${day.entryCount} refeiç${day.entryCount === 1 ? 'ão' : 'ões'}`
}

function dayAriaLabel(day: MonthDaySummary, target: number): string {
  const date = new Date(`${day.date}T12:00:00`)
  const label = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  return `${label}: ${dayTip(day, target)}`
}

export function NutritionMonthView({ patientId, compact = false }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<MonthSummary | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [hoveredDate, setHoveredDate] = useState('')
  const [dayEntries, setDayEntries] = useState<DayEntry[]>([])
  const [loadingDay, setLoadingDay] = useState(false)
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)

  const TODAY = todayKey()

  const isCurrentMonth =
    viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1

  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  const calorieTarget = summary?.targets?.caloriesKcal || 2000

  const avgCalories =
    summary && summary.daysWithEntries
      ? Math.round(summary.totals.caloriesKcal / summary.daysWithEntries).toLocaleString('pt-BR')
      : '0'

  const selectedDay = summary?.days.find((d) => d.date === selectedDate) || null
  const hoveredDaySummary = summary?.days.find((d) => d.date === hoveredDate) || null

  const hoveredDayTitle = hoveredDaySummary
    ? new Date(`${hoveredDaySummary.date}T12:00:00`).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : ''

  const detailTitle = selectedDay
    ? new Date(`${selectedDay.date}T12:00:00`).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : ''

  const loadDayEntries = useCallback(
    async (date: string) => {
      if (!date || !patientId) {
        setDayEntries([])
        return
      }
      setLoadingDay(true)
      try {
        const entries = await fetchFoodDiaryDay(patientId, date)
        setDayEntries(entries)
      } catch {
        setDayEntries([])
      } finally {
        setLoadingDay(false)
      }
    },
    [patientId],
  )

  const prevSelectedDateRef = useRef(selectedDate)
  useEffect(() => {
    if (prevSelectedDateRef.current !== selectedDate) {
      prevSelectedDateRef.current = selectedDate
      void loadDayEntries(selectedDate)
    }
  }, [selectedDate, loadDayEntries])

  const loadMonth = useCallback(
    async (year: number, month: number) => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchFoodDiaryMonth(patientId, year, month)
        setSummary(data)
        const todayInView = data.days.find((d) => d.date === TODAY)
        const fallback = data.days[data.days.length - 1]?.date || ''
        const next = todayInView?.date || fallback
        setSelectedDate(next)
      } catch {
        setError('Não foi possível carregar o panorama do mês.')
        setSummary(null)
      } finally {
        setLoading(false)
      }
    },
    [patientId, TODAY],
  )

  useEffect(() => {
    void loadMonth(viewYear, viewMonth)
  }, [loadMonth, viewYear, viewMonth])

  function shiftMonth(delta: number) {
    let month = viewMonth + delta
    let year = viewYear
    if (month < 1) {
      month = 12
      year -= 1
    } else if (month > 12) {
      month = 1
      year += 1
    }
    setViewYear(year)
    setViewMonth(month)
  }

  return (
    <div className={`${styles.root} ${compact ? styles.compact : ''}`}>
      <div className={styles.nav}>
        <button
          type="button"
          className={styles.navBtn}
          aria-label="Mês anterior"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft size={16} />
        </button>
        <h2 className={styles.title}>{monthLabel}</h2>
        <button
          type="button"
          className={styles.navBtn}
          aria-label="Próximo mês"
          disabled={isCurrentMonth}
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {loading && <div className={styles.loading}>Carregando panorama…</div>}
      {!loading && error && <p className={styles.error}>{error}</p>}

      {!loading && !error && summary && (
        <>
          <div className={styles.summaryCard}>
            <div className={styles.stat}>
              <strong>{summary.totals.caloriesKcal.toLocaleString('pt-BR')}</strong>
              <span>kcal no mês</span>
            </div>
            <div className={styles.stat}>
              <strong>{summary.daysWithEntries}</strong>
              <span>dias registrados</span>
            </div>
            <div className={styles.stat}>
              <strong>{avgCalories}</strong>
              <span>média/dia</span>
            </div>
          </div>

          <div className={styles.grid} role="list" aria-label="Calorias por dia">
            {summary.days.map((day) => (
              <button
                key={day.date}
                type="button"
                role="listitem"
                className={[
                  styles.day,
                  day.date === TODAY ? styles.dayToday : '',
                  !day.entryCount ? styles.dayEmpty : '',
                  day.date === selectedDate ? styles.daySelected : '',
                  day.date === hoveredDate && day.date !== selectedDate ? styles.dayHovered : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={dayAriaLabel(day, calorieTarget)}
                onClick={() => setSelectedDate(day.date)}
                onMouseEnter={() => setHoveredDate(day.date)}
                onMouseLeave={() => setHoveredDate('')}
                onFocus={() => setHoveredDate(day.date)}
                onBlur={() => setHoveredDate('')}
              >
                <span className={styles.dayNum}>{dayNumber(day.date)}</span>
                <span
                  className={styles.dayBar}
                  style={{
                    height: `${barHeight(day, calorieTarget)}%`,
                    backgroundColor: barColor(day, calorieTarget),
                  }}
                  aria-hidden
                />
                {(hoveredDate === day.date || selectedDate === day.date) && !compact && (
                  <span className={styles.tip} role="tooltip">
                    {dayTip(day, calorieTarget)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {compact && hoveredDaySummary && (
            <p className={styles.hoverReadout}>
              <strong>{hoveredDayTitle}</strong>
              <span>{dayTip(hoveredDaySummary, calorieTarget)}</span>
            </p>
          )}

          {selectedDay && (
            <article className={styles.detail}>
              <h3>{detailTitle}</h3>
              {!selectedDay.entryCount ? (
                <p className={styles.detailEmpty}>Nenhuma refeição registrada neste dia.</p>
              ) : (
                <>
                  <div className={styles.macros}>
                    <span>
                      <strong>{selectedDay.consumed.caloriesKcal}</strong> kcal
                    </span>
                    <span>C {selectedDay.consumed.carbsG}g</span>
                    <span>P {selectedDay.consumed.proteinG}g</span>
                    <span>G {selectedDay.consumed.fatG}g</span>
                  </div>
                  <p className={styles.detailMeta}>
                    {selectedDay.entryCount} refeiç
                    {selectedDay.entryCount === 1 ? 'ão' : 'ões'} registrada
                    {selectedDay.entryCount === 1 ? '' : 's'}
                    {summary.targets?.caloriesKcal && (
                      <> · meta {summary.targets.caloriesKcal} kcal</>
                    )}
                  </p>

                  {loadingDay && (
                    <p className={styles.detailLoading}>Carregando refeições…</p>
                  )}
                  {!loadingDay && dayEntries.length > 0 && (
                    <ul className={styles.entries}>
                      {dayEntries.map((entry) => (
                        <li key={entry.id} className={styles.entry}>
                          {entry.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={entry.imageUrl}
                              alt=""
                              className={styles.entryImg}
                              loading="lazy"
                            />
                          )}
                          <div>
                            <strong>{entry.mealLabel || entry.mealType}</strong>
                            <span>
                              {entry.caloriesKcal} kcal · P {entry.proteinG}g · C {entry.carbsG}g
                              · G {entry.fatG}g
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </article>
          )}
        </>
      )}
    </div>
  )
}
