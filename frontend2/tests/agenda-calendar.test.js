import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildWeekDays,
  buildSlotDateTimeFromMinutes,
  endOfWeek,
  filterAppointmentsByQuery,
  formatTimeRangeLabel,
  groupAppointmentsByDay,
  isSameDay,
  minutesToPx,
  normalizeDraggedRange,
  startOfWeek,
  toDateKey,
  yPxToMinutes,
} from '../utils/agenda-calendar.js'

describe('agenda calendar utils', () => {
  it('monta semana começando na segunda', () => {
    const anchor = new Date('2026-07-15T12:00:00')
    const weekStart = startOfWeek(anchor, 1)
    assert.equal(weekStart.getDay(), 1)
    const days = buildWeekDays(anchor, 1)
    assert.equal(days.length, 7)
    assert.equal(days[0].weekdayLabel, 'Seg')
  })

  it('agrupa agendamentos por dia', () => {
    const grouped = groupAppointmentsByDay([
      { id: '1', startsAt: '2026-07-15T10:00:00.000Z', patientName: 'Ana' },
      { id: '2', startsAt: '2026-07-16T09:00:00.000Z', patientName: 'Bia' },
      { id: '3', startsAt: '2026-07-15T14:00:00.000Z', patientName: 'Ana' },
    ])
    assert.equal(grouped.get('2026-07-15')?.length, 2)
    assert.equal(grouped.get('2026-07-16')?.length, 1)
  })

  it('filtra agendamentos por nome do paciente', () => {
    const filtered = filterAppointmentsByQuery([
      { patientName: 'Maria Silva', title: 'Consulta' },
      { patientName: 'João Souza', title: 'Retorno' },
    ], 'maria')
    assert.equal(filtered.length, 1)
  })

  it('calcula fim da semana', () => {
    const anchor = new Date('2026-07-15T12:00:00')
    const end = endOfWeek(anchor, 1)
    assert.ok(end.getTime() > anchor.getTime())
    assert.equal(isSameDay(end, new Date('2026-07-19T23:59:00')), true)
    assert.equal(toDateKey(end), '2026-07-19')
  })

  it('normaliza intervalo arrastado com snap de 15 min', () => {
    const range = normalizeDraggedRange(7 * 60 + 7, 7 * 60 + 38)
    assert.equal(range.startMinutes, 7 * 60)
    assert.equal(range.endMinutes, 7 * 60 + 45)
    assert.equal(range.durationMin, 45)
  })

  it('converte posição Y em minutos e de volta para px', () => {
    const minutes = yPxToMinutes(0)
    assert.equal(minutes, 6 * 60)
    assert.equal(minutesToPx(minutes), 0)
  })

  it('monta datetime a partir de minutos no dia', () => {
    const iso = buildSlotDateTimeFromMinutes('2030-01-15', 9 * 60 + 30)
    const date = new Date(iso)
    assert.equal(date.getHours(), 9)
    assert.equal(date.getMinutes(), 30)
  })

  it('formata intervalo de horário', () => {
    assert.equal(formatTimeRangeLabel(540, 600), '09:00 – 10:00')
  })
})
