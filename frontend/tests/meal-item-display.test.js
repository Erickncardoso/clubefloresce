import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { splitMealItemDisplay } from '../utils/meal-item-display.js'

describe('splitMealItemDisplay', () => {
  it('separa nome e gramas', () => {
    const result = splitMealItemDisplay('Morango 5 Unidade(s) média(s) (60g)')
    assert.equal(result.name, 'Morango 5 Unidade(s) média(s)')
    assert.equal(result.portion, '60 g')
  })

  it('separa mililitros', () => {
    const result = splitMealItemDisplay('Chá de camomila 1 Xícara(s) de chá (200ml)')
    assert.equal(result.portion, '200 ml')
  })
})
