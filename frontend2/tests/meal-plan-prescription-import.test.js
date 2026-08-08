import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPrescriptionFromParsedPlan,
  buildParsedMealPlanFromPrescription,
  findImportedPrescription,
  importPrescriptionIdForMealPlan,
  parseSubstitutionList,
  shouldSyncImportedPrescription,
} from '../utils/meal-plan-prescription.js'

describe('meal plan prescription import', () => {
  it('monta prescrição por alimentos a partir do plano parseado do PDF', () => {
    const parsedPlan = {
      title: 'Cardápio 1: Ativando a desinflamação',
      prescribedAt: '03/07/2026',
      fileName: 'planejamento.php.pdf',
      nutritionTotals: {
        proteinG: 120,
        fatG: 45,
        carbsG: 180,
        caloriesKcal: 1800,
      },
      meals: [
        {
          id: '0615-cafe',
          time: '06:15',
          label: 'Café da manhã',
          macros: {
            proteinG: 25,
            fatG: 12,
            carbsG: 30,
            caloriesKcal: 350,
          },
          items: [
            {
              key: 'ovo',
              name: 'Ovo de galinha',
              amount: 1,
              unit: 'unidade',
              grams: 50,
              display: 'Ovo de galinha 1 Unidade(s) (50g)',
              substitutions: [{ display: 'Omelete - 2 unidade(s) (100g)' }],
            },
          ],
        },
      ],
    }

    const prescription = buildPrescriptionFromParsedPlan(parsedPlan, {
      id: 'pdf-import-abc',
      fileName: 'planejamento.php.pdf',
    })

    assert.equal(prescription.id, 'pdf-import-abc')
    assert.equal(prescription.methodology, 'foods')
    assert.equal(prescription.status, 'active')
    assert.equal(prescription.startDate, '2026-07-03')
    assert.equal(prescription.meals.length, 1)
    assert.equal(prescription.meals[0].items[0].name, 'Ovo de galinha')
    assert.equal(prescription.meals[0].items[0].amount, '1')
    assert.equal(prescription.meals[0].items[0].unit, 'Unidade(s) (50g)')
    assert.equal(prescription.meals[0].items[0].grams, 50)
    assert.equal(prescription.meals[0].macros?.caloriesKcal, 350)
    assert.equal(prescription.nutritionTotals?.caloriesKcal, 1800)
    assert.equal(prescription.meals[0].items[0].options, 'Omelete - 2 unidade(s) (100g)')
    assert.match(prescription.finalNotes, /planejamento\.php\.pdf/)
  })

  it('preserva substituições com vírgula quando separadas por linha', () => {
    const item = {
      options: 'Chá mate - 1 xícara (200ml)\nOmelete - 2 unidade(s) (100g)',
    }

    assert.deepEqual(parseSubstitutionList(item), [
      'Chá mate - 1 xícara (200ml)',
      'Omelete - 2 unidade(s) (100g)',
    ])

    const parsed = buildParsedMealPlanFromPrescription({
      methodology: 'foods',
      meals: [{
        id: 'm1',
        time: '08:00',
        label: 'Café',
        items: [{
          id: 'a1',
          name: 'Ovo',
          display: 'Ovo - 1 un',
          options: item.options,
        }],
      }],
    })

    assert.equal(parsed.meals[0].items[0].substitutions.length, 2)
    assert.equal(parsed.meals[0].items[0].substitutions[0].display, 'Chá mate - 1 xícara (200ml)')
  })

  it('identifica e sincroniza prescrição importada pelo id do plano', () => {
    const mealPlan = {
      id: 'plan-123',
      fileName: 'planejamento.php.pdf',
      updatedAt: '2026-07-03T12:00:00.000Z',
      plan: {
        title: 'Cardápio 1',
        meals: [{ id: 'm1', time: '08:00', label: 'Café', items: [{ key: 'a', name: 'Banana', display: 'Banana' }] }],
      },
    }

    assert.equal(importPrescriptionIdForMealPlan(mealPlan), 'pdf-import-plan-123')
    assert.equal(findImportedPrescription([], mealPlan), null)
    assert.equal(shouldSyncImportedPrescription(mealPlan, null), true)

    const existing = {
      id: 'pdf-import-plan-123',
      meals: [{ items: [] }],
      updatedAt: '2026-07-02T12:00:00.000Z',
    }
    assert.equal(shouldSyncImportedPrescription(mealPlan, existing), true)
  })

  it('não sobrescreve prescrição salva pelo nutri com o PDF importado', () => {
    const mealPlan = {
      id: 'plan-123',
      updatedAt: '2026-07-02T12:00:00.000Z',
      plan: {
        meals: [{ id: 'm1', time: '08:00', label: 'Café', items: [{ key: 'a', name: 'Banana', display: 'Banana' }] }],
      },
    }

    const existing = {
      id: 'pdf-import-plan-123',
      meals: [{ items: [{ name: 'Pão integral', display: 'Pão integral 1 fatia' }] }],
      updatedAt: '2026-07-05T12:00:00.000Z',
    }

    assert.equal(shouldSyncImportedPrescription(mealPlan, existing), false)
  })
})
