import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildNutritionSummaryDocumentModel,
  enrichMealNutritionRows,
  nutritionSummaryPdfFilename,
} from '../utils/meal-plan-nutrition-summary-payload.js'

describe('meal plan nutrition summary payload', () => {
  it('enriquece linhas de refeição com percentuais', () => {
    const rows = enrichMealNutritionRows([
      {
        id: '1',
        label: '08:00 · Café da manhã',
        caloriesKcal: 400,
        carbsG: 50,
        proteinG: 20,
        fatG: 10,
      },
    ])

    assert.equal(rows[0].carbsPctLabel, '54%')
    assert.equal(rows[0].proteinPctLabel, '22%')
    assert.match(rows[0].caloriesLabel, /400/)
  })

  it('monta modelo do documento com totais e legenda', () => {
    const model = buildNutritionSummaryDocumentModel({
      printContext: { planTitle: 'Plano Low Carb' },
      macros: {
        caloriesKcal: 1800,
        carbsG: 180,
        proteinG: 120,
        fatG: 60,
      },
      mealRows: [
        {
          id: 'lunch',
          label: '12:00 · Almoço',
          caloriesKcal: 700,
          carbsG: 70,
          proteinG: 45,
          fatG: 20,
        },
      ],
    })

    assert.equal(model.legend.length, 3)
    assert.equal(model.meals.length, 1)
    assert.ok(model.kcalLabel.includes('1800'))
    assert.equal(model.percents.carbs, 41)
  })

  it('gera nome de arquivo seguro para download', () => {
    assert.equal(
      nutritionSummaryPdfFilename({ planTitle: 'Plano Ana — Emagrecimento' }),
      'plano-ana-emagrecimento.pdf',
    )
  })
})
