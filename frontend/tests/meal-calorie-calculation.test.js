import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { normalizePer100gMacros, macrosAtGramsFromPer100g } from '../utils/food-macros.js'
import { resolveItemGrams, amountToGrams } from '../utils/meal-portion-measures.js'
import { macrosForFoodRecord } from '../utils/food-bank.js'

function tacoBananaFood() {
  const tacoPath = join(process.cwd(), 'backend/data/foods/taco.json')
  const taco = JSON.parse(readFileSync(tacoPath, 'utf8'))
  const row = taco.find((item) => item.name === 'Banana, prata, crua')
  assert.ok(row, 'Banana TACO deve existir')
  return {
    id: 'taco-banana',
    source: 'TACO',
    name: row.name,
    per100g: {
      caloriesKcal: row.caloriesKcal,
      proteinG: row.proteinG,
      carbsG: row.carbsG,
      fatG: row.fatG,
      fiberG: row.fiberG,
    },
    nutrients: { per100g: row.nutrientsPer100g },
  }
}

describe('cálculo de calorias — porções e TACO', () => {
  it('banana TACO: 98 kcal / 100 g', () => {
    const food = tacoBananaFood()
    const per100 = normalizePer100gMacros(food)
    assert.equal(per100.caloriesKcal, 98)
    assert.equal(per100.energyPolicy, 'table')
  })

  it('1 banana (~90 g) ≈ 88 kcal, não 400', () => {
    const food = tacoBananaFood()
    const grams = resolveItemGrams({
      name: 'Banana',
      amount: '1',
      unit: 'unidade',
    })
    assert.equal(grams, 90)
    const macros = macrosForFoodRecord(food, grams)
    assert.equal(macros.caloriesKcal, 88)
  })

  it('4 bananas (~360 g) ≈ 353 kcal, não 400 por unidade errada', () => {
    const food = tacoBananaFood()
    const grams = resolveItemGrams({
      name: 'Banana prata',
      amount: '4',
      unit: 'Unidade(s)',
    })
    assert.equal(grams, 360)
    const macros = macrosForFoodRecord(food, grams)
    assert.equal(macros.caloriesKcal, 353)
  })

  it('porção sem grams explícitos calcula macros corretamente', () => {
    const food = tacoBananaFood()
    const grams = resolveItemGrams({
      name: 'Banana',
      amount: '2',
      unit: 'unidade',
      grams: null,
      portionAmount: 2,
      portionMeasure: 'unidade',
    })
    const macros = macrosForFoodRecord(food, grams)
    assert.equal(macros.caloriesKcal, 176)
  })

  it('400 g de banana ≈ 392 kcal (porção grande, não bug de tabela)', () => {
    const food = tacoBananaFood()
    const macros = macrosAtGramsFromPer100g(normalizePer100gMacros(food), 400)
    assert.equal(macros.caloriesKcal, 392)
  })

  it('amountToGrams em gramas retorna o valor informado', () => {
    assert.equal(amountToGrams(120, 'grams', 'Banana'), 120)
  })

  it('1 unidade de banana ignora grams placeholder de 100 g', () => {
    const grams = resolveItemGrams({
      name: 'Banana',
      amount: '1',
      unit: 'unidade',
      grams: 100,
    })
    assert.equal(grams, 90)
    const food = tacoBananaFood()
    const macros = macrosForFoodRecord(food, grams)
    assert.equal(macros.caloriesKcal, 88)
  })
})
