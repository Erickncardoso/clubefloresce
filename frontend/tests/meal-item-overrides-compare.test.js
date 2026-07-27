import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

function normalizeOverrideDisplay(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function isSameOverride(a, b) {
  if (!a && !b) return true
  if (!a || !b) return false

  const aDisplay = normalizeOverrideDisplay(a.display || a.label || '')
  const bDisplay = normalizeOverrideDisplay(b.display || b.label || '')
  if (!aDisplay || !bDisplay) return false
  return aDisplay === bDisplay
}

describe('meal item override comparison', () => {
  it('trata travessão e hífen como equivalentes', () => {
    const stored = { display: 'Leite de vaca integral UHT – 1 Copo americano pequeno (165ml)' }
    const option = { label: 'Leite de vaca integral UHT - 1 Copo americano pequeno (165ml)' }

    assert.equal(isSameOverride(stored, option), true)
  })

  it('detecta opções diferentes', () => {
    const first = { display: 'Leite integral UHT (165ml)' }
    const second = { display: 'Leite desnatado em pó (30g)' }

    assert.equal(isSameOverride(first, second), false)
  })

  it('prescrito (null) só combina com null', () => {
    assert.equal(isSameOverride(null, null), true)
    assert.equal(isSameOverride(null, { display: 'Uva Itália (120g)' }), false)
  })
})
