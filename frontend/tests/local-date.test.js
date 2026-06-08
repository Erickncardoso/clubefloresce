import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getLocalDateKey, getLocalTimeParts } from '../utils/local-date.js'

describe('local-date', () => {
  it('formata data local em fuso específico', () => {
    const date = new Date('2026-06-07T02:30:00.000Z')
    assert.equal(getLocalDateKey(date, 'America/Sao_Paulo'), '2026-06-06')
    assert.equal(getLocalDateKey(date, 'Europe/Lisbon'), '2026-06-07')
  })

  it('calcula minutos locais no fuso', () => {
    const date = new Date('2026-06-07T20:00:00.000Z')
    const lisbon = getLocalTimeParts(date, 'Europe/Lisbon')
    assert.equal(lisbon.hour, 21)
    assert.equal(lisbon.minutes, 21 * 60)
  })
})
