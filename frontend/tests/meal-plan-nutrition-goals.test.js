import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  gramsFromMacroPercents,
  gramsFromPerKg,
  normalizeMacroGoalsForSave,
  percentsFromMacroGrams,
} from '../utils/meal-plan-nutrition-goals.js'

describe('meal plan nutrition goals', () => {
  it('converte percentuais do VET em gramas', () => {
    const grams = gramsFromMacroPercents(2000, { proteinPct: 25, carbsPct: 50, fatPct: 25 })
    assert.equal(grams.proteinG, 125)
    assert.equal(grams.carbsG, 250)
    assert.equal(grams.fatG, 55.6)
  })

  it('salva metas percentuais com gramas calculados', () => {
    const saved = normalizeMacroGoalsForSave({
      goalType: 'percent',
      includeCalories: true,
      caloriesKcal: 1800,
      proteinPct: 20,
      carbsPct: 50,
      fatPct: 30,
    })
    assert.equal(saved.goalType, 'percent')
    assert.equal(saved.proteinG, 90)
    assert.equal(saved.carbsG, 225)
    assert.equal(saved.proteinPct, 20)
  })

  it('converte metas por kg usando peso da paciente', () => {
    const grams = gramsFromPerKg(70, { proteinGPerKg: 1.5, carbsGPerKg: 3, fatGPerKg: 0.8 })
    assert.equal(grams.proteinG, 105)
    assert.equal(grams.carbsG, 210)
    assert.equal(grams.fatG, 56)
  })

  it('calcula percentuais a partir de gramas', () => {
    const pct = percentsFromMacroGrams(2000, { proteinG: 125, carbsG: 250, fatG: 55.6 })
    assert.equal(pct.proteinPct, 25)
    assert.equal(pct.carbsPct, 50)
    assert.equal(pct.fatPct, 25)
  })
})
