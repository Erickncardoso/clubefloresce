import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildMealMacroSummary, hasLiveMealMacros, mealMacroPercents } from '../utils/meal-plan-live-macros.js'
import { computeFoodItemMacros, sumMealItemsMacros } from '../utils/meal-plan-prescription.js'

describe('meal plan live macros', () => {
  it('calcula percentuais de macros da refeição', () => {
    const percents = mealMacroPercents({
      caloriesKcal: 500,
      carbsG: 50,
      proteinG: 25,
      fatG: 11.1,
    })
    assert.equal(percents.carbs, 50)
    assert.equal(percents.protein, 25)
    assert.equal(percents.fat, 25)
  })

  it('monta resumo com chips por macro', () => {
    const summary = buildMealMacroSummary({
      caloriesKcal: 400,
      carbsG: 40,
      proteinG: 30,
      fatG: 11.1,
    })
    assert.equal(summary.chips.length, 3)
    assert.equal(summary.chips[0].label, 'CHO')
    assert.ok(summary.chips[0].percent > 0)
  })

  it('calcula macros de alimento a partir da TBCA/TACO', () => {
    const macros = computeFoodItemMacros({
      name: 'Arroz',
      foodSource: 'TACO',
      grams: 150,
      per100g: { caloriesKcal: 130, proteinG: 2.5, carbsG: 28, fatG: 0.3 },
    })
    assert.equal(macros.caloriesKcal, 195)
    assert.equal(macros.carbsG, 42)
  })

  it('soma macros dos itens da refeição', () => {
    const totals = sumMealItemsMacros([
      {
        foodSource: 'TACO',
        grams: 100,
        per100g: { caloriesKcal: 100, proteinG: 10, carbsG: 10, fatG: 2 },
      },
      {
        foodSource: 'TACO',
        grams: 50,
        per100g: { caloriesKcal: 200, proteinG: 20, carbsG: 5, fatG: 10 },
      },
    ])
    assert.equal(totals.caloriesKcal, 200)
    assert.equal(totals.proteinG, 20)
    assert.ok(hasLiveMealMacros(totals))
  })

  it('escala macros de receita por porções', () => {
    const macros = computeFoodItemMacros({
      itemType: 'recipe',
      portionAmount: 2,
      recipeSnapshot: {
        macros: { caloriesKcal: 300, proteinG: 20, carbsG: 30, fatG: 10 },
      },
    })
    assert.equal(macros.caloriesKcal, 600)
    assert.equal(macros.proteinG, 40)
  })
})
