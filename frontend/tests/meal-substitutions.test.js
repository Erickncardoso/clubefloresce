import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatMealItemLabel } from '../utils/meal-plan-format.js'

describe('meal substitutions display', () => {
  it('usa display do PDF quando disponível', () => {
    const item = {
      display: 'Arroz branco cozido 3 Colher(es) de sopa cheia(s) (75g)',
      name: 'Arroz branco cozido',
    }
    assert.equal(formatMealItemLabel(item), item.display)
  })
})
