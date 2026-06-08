import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatMealItemLabel } from '../utils/meal-plan-format.js'
import { getMealIdForTime } from '../config/meal-plan.js'

describe('formatMealItemLabel', () => {
  it('formata gramas e mililitros', () => {
    assert.equal(formatMealItemLabel({ food: 'arroz integral', amount: 150, unit: 'g' }), '150 g arroz integral')
    assert.equal(formatMealItemLabel({ food: 'chá verde', amount: 200, unit: 'ml' }), '200 ml chá verde')
  })

  it('formata fatias e colheres', () => {
    assert.equal(formatMealItemLabel({ food: 'pão integral', amount: 1, unit: 'fatia' }), '1 fatia de pão integral')
    assert.equal(formatMealItemLabel({ food: 'cottage', amount: 2, unit: 'colher', qualifier: 'sopa' }), '2 col. (sopa) de cottage')
  })

  it('formata porções especiais', () => {
    assert.equal(formatMealItemLabel({ food: 'mamão papaya', amount: 0.5, unit: 'unidade' }), '1/2 mamão papaya')
    assert.equal(formatMealItemLabel({ food: 'salada verde', unit: 'avontade' }), 'Salada verde à vontade')
    assert.equal(formatMealItemLabel({ food: 'omelete', amount: 2, unit: 'ovos' }), 'Omelete com 2 ovos')
  })
})

describe('getMealIdForTime', () => {
  it('retorna refeição conforme horário', () => {
    assert.equal(getMealIdForTime(new Date('2026-06-05T08:30:00')), 'breakfast')
    assert.equal(getMealIdForTime(new Date('2026-06-05T12:30:00')), 'lunch')
    assert.equal(getMealIdForTime(new Date('2026-06-05T19:00:00')), 'dinner')
  })
})
