import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatMealItemLabel } from '../utils/meal-plan-format.js'

function applyOverridesToMeal(meal, overrides) {
  const items = meal.items.map((item) => {
    const override = overrides[item.key]
    if (!override) return { ...item, isSubstituted: false }
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
    assert.equal(formatMealItemLabel({ display: updated.itemLabels[0] }), updated.itemLabels[0])
  })
})
