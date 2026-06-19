import test from 'node:test'
import assert from 'node:assert/strict'
import {
  amountToGrams,
  gramsToAmount,
  guessGramsPerUnit,
  looksLikeRecipe,
} from '../utils/meal-portion-measures.js'
import { isItemCounted, normalizeMealItemsForSave } from '../utils/meal-diary.js'

test('kiwi: 1 unidade ≈ 80 g', () => {
  assert.equal(guessGramsPerUnit('Kiwi'), 80)
  assert.equal(amountToGrams(1, 'unidade', 'Kiwi'), 80)
  assert.equal(gramsToAmount(80, 'unidade', 'Kiwi'), 1)
})

test('colher de sopa padrão', () => {
  assert.equal(amountToGrams(2, 'colher', 'arroz'), 30)
})

test('detecta receitas compostas', () => {
  assert.equal(looksLikeRecipe('Lasanha à bolonhesa'), true)
  assert.equal(looksLikeRecipe('Arroz branco cozido'), false)
})

test('isItemCounted exige food_bank', () => {
  assert.equal(isItemCounted({ foodId: '1', source: 'food_bank' }), true)
  assert.equal(isItemCounted({ foodId: null, source: 'ai' }), false)
})

test('normalizeMealItemsForSave preserva macros da IA', () => {
  const saved = normalizeMealItemsForSave([
    {
      name: 'Bolo',
      grams: 100,
      caloriesKcal: 300,
      carbsG: 40,
      proteinG: 5,
      fatG: 10,
      source: 'ai',
    },
  ])
  assert.equal(saved[0].caloriesKcal, 300)
  assert.equal(saved[0].proteinG, 5)
})
