import assert from 'node:assert/strict'
import test from 'node:test'
import {
  defaultExtraQuantityForUnit,
  formatExtraItemLabel,
  resolveExtraItemGrams,
} from '../utils/meal-extra-quantity.js'

test('defaultExtraQuantityForUnit usa 1 unidade por padrão', () => {
  assert.deepEqual(defaultExtraQuantityForUnit('Banana prata'), { amount: 1, unit: 'unidade' })
  assert.deepEqual(defaultExtraQuantityForUnit('Banana prata', 'g'), { amount: 90, unit: 'g' })
})

test('resolveExtraItemGrams converte g, kg, ml e unidade', () => {
  assert.equal(resolveExtraItemGrams(150, 'g', 'Arroz'), 150)
  assert.equal(resolveExtraItemGrams(0.5, 'kg', 'Arroz'), 500)
  assert.equal(resolveExtraItemGrams(200, 'ml', 'Leite'), 200)
  assert.equal(resolveExtraItemGrams(2, 'unidade', 'Banana'), 180)
})

test('formatExtraItemLabel monta texto legível', () => {
  assert.equal(formatExtraItemLabel('Arroz branco', 150, 'g'), '150 g Arroz branco')
  assert.equal(formatExtraItemLabel('Arroz branco', 0.5, 'kg'), '0,5 kg Arroz branco')
  assert.equal(formatExtraItemLabel('Banana', 2, 'unidade'), '2 unidades de Banana')
})
