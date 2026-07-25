import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeBodySurfaceArea,
  computeHydrationBreakdown,
  computeHydrationGoal,
  createEmptyHydrationPrescription,
  hasManualHydrationOverride,
  normalizeHydrationPrescription,
} from '../utils/meal-plan-hydration.js'
import {
  buildHydrationWeekDays,
  countRemindersInWindow,
  formatHydrationCups,
  hydrationPerReminder,
  markHydrationFeedbackRead,
  startOfWeek,
} from '../utils/meal-plan-hydration-tracking.js'

describe('meal plan hydration', () => {
  it('calcula meta hídrica a partir de peso, altura, atividade e clima', () => {
    const prescription = normalizeHydrationPrescription({
      weightKg: 70,
      heightCm: 170,
      activityLevel: 'moderate',
      activityDurationMin: 60,
      hotHumidClimate: true,
    })
    const breakdown = computeHydrationBreakdown(prescription)
    assert.ok(breakdown.totalMl > 2000)
    assert.equal(computeHydrationGoal(prescription), breakdown.totalMl)
  })

  it('preserva meta manual e indica override', () => {
    const prescription = normalizeHydrationPrescription({
      weightKg: 70,
      heightCm: 170,
      customDailyMl: 3000,
      manualOverride: true,
    })
    assert.equal(computeHydrationGoal(prescription), 3000)
    assert.equal(hasManualHydrationOverride(prescription, 2500), true)
  })

  it('usa metas diferentes no modo diário', () => {
    const prescription = normalizeHydrationPrescription({
      scheduleMode: 'daily',
      weightKg: 70,
      heightCm: 170,
      dailyGoals: { mon: 2200, tue: 2400 },
    })
    assert.equal(computeHydrationGoal(prescription, 'mon'), 2200)
    assert.equal(computeHydrationGoal(prescription, 'tue'), 2400)
  })

  it('calcula copos por lembrete na janela de consumo', () => {
    const ml = hydrationPerReminder(2400, '06:00', '20:00', 2)
    const reminders = countRemindersInWindow('06:00', '20:00', 2)
    assert.ok(ml > 0)
    assert.ok(reminders >= 7)
    assert.match(formatHydrationCups(ml), /copo/)
  })

  it('monta semana com consumo, déficit e excedente', () => {
    const weekStart = startOfWeek(new Date('2026-07-06T12:00:00'))
    const prescription = createEmptyHydrationPrescription({ weightKg: 70, heightCm: 170 })
    const goal = computeHydrationGoal(prescription, 'mon')
    const days = buildHydrationWeekDays(weekStart, prescription, [
      { id: '1', date: '2026-07-06', consumedMl: goal - 300, goalMl: goal, source: 'app' },
      { id: '2', date: '2026-07-07', consumedMl: goal + 200, goalMl: goal, source: 'app' },
    ])
    assert.equal(days.length, 7)
    assert.equal(days[0].deficitMl, 300)
    assert.equal(days[1].surplusMl, 200)
  })

  it('marca feedback como lido', () => {
    const items = [{ id: 'a', message: 'Bebi menos hoje', createdAt: '2026-07-01T10:00:00.000Z' }]
    const next = markHydrationFeedbackRead(items)
    assert.ok(next[0].readAt)
  })

  it('calcula superfície corporal (Du Bois)', () => {
    const bsa = computeBodySurfaceArea(70, 170)
    assert.ok(bsa > 1.7 && bsa < 2.0)
  })
})
