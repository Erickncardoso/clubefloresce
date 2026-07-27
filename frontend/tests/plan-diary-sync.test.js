import assert from 'node:assert/strict'
import test from 'node:test'
import { parseMeasureFromDisplay, resolvePlanItemGrams } from '../utils/plan-diary-sync.js'

test('parseMeasureFromDisplay extrai gramas do texto exibido', () => {
  assert.deepEqual(parseMeasureFromDisplay('Mussarela (50g)'), { grams: 50 })
  assert.deepEqual(parseMeasureFromDisplay('30g whey protein'), { grams: 30 })
  assert.deepEqual(parseMeasureFromDisplay('Whey protein 30g'), { grams: 30 })
})

test('resolvePlanItemGrams usa gramas reais e nunca assume 100g', () => {
  assert.equal(resolvePlanItemGrams({ grams: 50, unit: 'porcao', display: 'Mussarela (50g)' }), 50)
  assert.equal(resolvePlanItemGrams({ display: '30g whey protein', unit: '', grams: null }), 30)
  assert.equal(resolvePlanItemGrams({ amount: 2, unit: 'colher', name: 'Aveia' }), 30)
  assert.equal(resolvePlanItemGrams({ name: 'Salada', unit: 'porcao', amount: null, grams: null }), 0)
})

test('resolvePlanItemGrams prioriza (XXg) do display sobre grams placeholder', () => {
  assert.equal(
    resolvePlanItemGrams({
      grams: 100,
      amount: 1,
      unit: 'Unidade(s)',
      display: 'Ovo de galinha 1 Unidade(s) (50g)',
      name: 'Ovo de galinha',
    }),
    50,
  )
  assert.equal(
    resolvePlanItemGrams({
      grams: 100,
      amount: 2,
      unit: 'Fatia(s)',
      display: 'Queijo muçarela 2 Fatia(s) (25g)',
      name: 'Queijo muçarela',
    }),
    25,
  )
})

test('resolvePlanItemGrams usa label formatado quando display está vazio', () => {
  assert.equal(
    resolvePlanItemGrams({
      grams: 100,
      amount: 50,
      unit: 'g',
      name: 'Mussarela',
      display: null,
    }),
    50,
  )
  assert.equal(
    resolvePlanItemGrams({
      grams: 100,
      amount: 1,
      unit: 'dosador',
      name: 'Whey protein',
      display: null,
    }),
    30,
  )
})

test('parseMeasureFromDisplay encontra gramas no meio do texto', () => {
  assert.deepEqual(parseMeasureFromDisplay('Queijo muçarela, 50 g, fatiado'), { grams: 50 })
})

test('resolvePlanItemGrams corrige item com name corrompido', () => {
  assert.equal(
    resolvePlanItemGrams({
      name: 'com mussarela Ovo de galinha',
      display: 'Ovo de galinha 1 Unidade(s) (50g)',
      grams: 100,
      unit: 'unidade',
      amount: 1,
    }),
    50,
  )
})

test('resolvePlanItemGrams usa 20g de Aveia em flocos no name, não colheres', () => {
  assert.equal(
    resolvePlanItemGrams({
      name: 'Aveia em flocos 20g',
      display: null,
      grams: 60,
      amount: 4,
      unit: 'colher',
    }),
    20,
  )
  assert.equal(
    resolvePlanItemGrams({
      display: 'Aveia em flocos 20g',
      name: 'Aveia em flocos',
      grams: 60,
      amount: 4,
      unit: 'colher',
    }),
    20,
  )
})

test('buildPlanDiaryItems envia 20g para Aveia marcada no plano', async () => {
  const { buildPlanDiaryItems } = await import('../utils/plan-diary-sync.js')
  const items = buildPlanDiaryItems(
    {
      itemLabels: ['Aveia em flocos 20g'],
      items: [{
        name: 'Aveia em flocos 20g',
        grams: 60,
        amount: 4,
        unit: 'colher',
        display: null,
      }],
    },
    [true],
  )
  assert.equal(items.length, 1)
  assert.equal(items[0].grams, 20)
  assert.equal(items[0].name, 'Aveia em flocos')
})
