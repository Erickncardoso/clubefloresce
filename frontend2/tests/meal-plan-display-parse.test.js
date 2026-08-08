import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeMealPlanItem,
  parseDietboxItemLine,
  resolveMealItemName,
} from '../utils/meal-plan-display-parse.js'

test('parseDietboxItemLine extrai nome, unidade e gramas do PDF', () => {
  const parsed = parseDietboxItemLine('Ovo de galinha 1 Unidade(s) (50g)')
  assert.equal(parsed.name, 'Ovo de galinha')
  assert.equal(parsed.amount, 1)
  assert.equal(parsed.unit, 'unidade')
  assert.equal(parsed.grams, 50)
})

test('normalizeMealPlanItem corrige name corrompido usando display', () => {
  const item = normalizeMealPlanItem({
    key: 'ovo',
    name: 'com mussarela Ovo de galinha',
    amount: 1,
    unit: 'unidade',
    grams: 100,
    display: 'Ovo de galinha 1 Unidade(s) (50g)',
  })

  assert.equal(item.name, 'Ovo de galinha')
  assert.equal(item.grams, 50)
  assert.equal(item.display, 'Ovo de galinha 1 Unidade(s) (50g)')
})

test('normalizeMealPlanItem infere gramas por unidade quando PDF não traz (XXg)', () => {
  const item = normalizeMealPlanItem({
    key: 'ovo',
    name: 'Ovo de galinha',
    amount: 1,
    unit: 'unidade',
    grams: 100,
    display: 'Ovo de galinha 1 Unidade(s)',
  })

  assert.equal(item.grams, 50)
})

test('resolveMealItemName ignora prefixo lixo no name', () => {
  assert.equal(
    resolveMealItemName({
      name: 'com mussarela Ovo de galinha',
      display: 'Ovo de galinha 1 Unidade(s) (50g)',
    }),
    'Ovo de galinha',
  )
})

test('normalizeMealPlanItem extrai 20g de Aveia em flocos 20g no name', () => {
  const item = normalizeMealPlanItem({
    name: 'Aveia em flocos 20g',
    grams: 60,
    amount: 4,
    unit: 'colher',
    display: null,
  })

  assert.equal(item.name, 'Aveia em flocos')
  assert.equal(item.grams, 20)
  assert.equal(item.display, 'Aveia em flocos 20g')
})

test('parseDietboxItemLine extrai gramas no sufixo sem parênteses', () => {
  const parsed = parseDietboxItemLine('Aveia em flocos 20g')
  assert.equal(parsed.name, 'Aveia em flocos')
  assert.equal(parsed.grams, 20)
})
