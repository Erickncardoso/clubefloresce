import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildWeekDays,
  endOfWeek,
  filterAppointmentsByQuery,
  groupAppointmentsByDay,
  isSameDay,
  startOfWeek,
  toDateKey,
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
})
