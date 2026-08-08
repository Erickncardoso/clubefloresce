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

function applyOverridesToMeal(meal, overrides) {
  const items = meal.items.map((item) => {
    const override = overrides[item.key]
    if (!override) return { ...item, isSubstituted: false }
    if (isSameOverride(item, override)) return { ...item, isSubstituted: false }
    return {
      ...item,
      display: override.display,
      isSubstituted: true,
      originalDisplay: item.display,
    }
  })

  return {
    ...meal,
    items,
    itemLabels: items.map((item) => item.display),
  }
}

describe('applyOverridesToMeal', () => {
  it('substitui item na lista da refeição', () => {
    const meal = {
      id: 'almoco',
      items: [
        {
          key: 'arroz',
          name: 'Arroz branco cozido',
          display: 'Arroz branco cozido 3 Colher(es) de sopa cheia(s) (75g)',
        },
      ],
      itemLabels: ['Arroz branco cozido 3 Colher(es) de sopa cheia(s) (75g)'],
    }

    const updated = applyOverridesToMeal(meal, {
      arroz: {
        display: 'Macarrão cozido - 3 Colher(es) de sopa cheia(s) (75g)',
      },
    })

    assert.equal(updated.itemLabels[0], 'Macarrão cozido - 3 Colher(es) de sopa cheia(s) (75g)')
    assert.equal(updated.items[0].isSubstituted, true)
  })

  it('não marca substituído quando override é igual ao prescrito', () => {
    const meal = {
      id: 'cafe',
      items: [
        {
          key: 'leite',
          display: 'Leite integral UHT - 1 Copo (165ml)',
        },
      ],
      itemLabels: ['Leite integral UHT - 1 Copo (165ml)'],
    }

    const updated = applyOverridesToMeal(meal, {
      leite: {
        display: 'Leite integral UHT – 1 Copo (165ml)',
      },
    })

    assert.equal(updated.items[0].isSubstituted, false)
    assert.equal(updated.itemLabels[0], meal.items[0].display)
  })
})
