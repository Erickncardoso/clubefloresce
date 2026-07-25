import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  duplicateMealPlanRecord,
  duplicateMealPlanTitle,
} from '../utils/meal-plan-duplicate.js'

describe('meal plan duplicate', () => {
  const source = {
    id: 'plan-1',
    title: 'Plano low carb',
    methodology: 'qualitative',
    status: 'active',
    objective: 'Emagrecimento',
    editorText: '08:00 - Café\nBanana - 1 un',
    editorHtml: '<p>08:00 - Café</p>',
    finalNotes: 'Beber água',
    meals: [
      {
        id: 'meal-1',
        time: '08:00',
        label: 'Café',
        notes: 'Sem açúcar',
        items: [
          {
            id: 'item-1',
            name: 'Omelete',
            amount: '2',
            unit: 'ovos',
          },
          {
            id: 'item-2',
            itemType: 'recipe',
            recipeId: 'recipe-1',
            name: 'Panqueca',
            recipeSnapshot: {
              id: 'recipe-1',
              title: 'Panqueca',
              ingredients: [{ id: 'ing-1', name: 'Aveia', amount: '3', unit: 'col' }],
            },
          },
        ],
      },
    ],
    nutritionTotals: { caloriesKcal: 1800, proteinG: 90, carbsG: 200, fatG: 60 },
    hydrationPrescription: { customDailyMl: 2500 },
    shoppingList: { customText: 'Banana\nAveia' },
    authorName: 'Nutri',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  }

  it('gera título padrão com sufixo cópia', () => {
    assert.equal(duplicateMealPlanTitle('Plano A'), 'Plano A (cópia)')
  })

  it('duplica plano com novo id e status rascunho', () => {
    const copy = duplicateMealPlanRecord(source, { authorName: 'Maria' })
    assert.notEqual(copy.id, source.id)
    assert.equal(copy.status, 'draft')
    assert.equal(copy.title, 'Plano low carb (cópia)')
    assert.equal(copy.authorName, 'Maria')
    assert.equal(copy.editorText, source.editorText)
    assert.equal(copy.finalNotes, source.finalNotes)
  })

  it('clona refeições, receitas e metadados com novos ids', () => {
    const copy = duplicateMealPlanRecord(source)
    assert.equal(copy.meals.length, 1)
    assert.notEqual(copy.meals[0].id, source.meals[0].id)
    assert.equal(copy.meals[0].notes, 'Sem açúcar')
    assert.equal(copy.meals[0].items.length, 2)
    assert.notEqual(copy.meals[0].items[0].id, 'item-1')

    const recipeItem = copy.meals[0].items[1]
    assert.equal(recipeItem.recipeId, 'recipe-1')
    assert.equal(recipeItem.recipeSnapshot.title, 'Panqueca')
    assert.notEqual(recipeItem.recipeSnapshot.ingredients[0].id, 'ing-1')
  })

  it('preserva hidratação, lista de compras e metas', () => {
    const copy = duplicateMealPlanRecord(source)
    assert.equal(copy.hydrationPrescription.customDailyMl, 2500)
    assert.equal(copy.shoppingList.customText, 'Banana\nAveia')
    assert.equal(copy.nutritionTotals.caloriesKcal, 1800)
  })
})
