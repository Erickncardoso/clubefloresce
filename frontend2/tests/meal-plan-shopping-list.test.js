import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  aggregateShoppingEntries,
  buildShoppingListFromPlan,
  extractShoppingListEntries,
  formatShoppingEntryLine,
  organizeShoppingListLocally,
  periodScaleFactor,
  shoppingListTextFromSections,
  smartListRemainingUses,
} from '../utils/meal-plan-shopping-list.js'

describe('meal plan shopping list', () => {
  const sampleMeals = [
    {
      id: 'm1',
      items: [
        { name: 'Arroz branco', amount: '2', unit: 'colheres' },
        { name: 'Peito de frango', amount: '150', unit: 'g' },
        {
          itemType: 'recipe',
          name: 'Panqueca proteica',
          amount: '2',
          unit: 'porções',
          recipeSnapshot: {
            title: 'Panqueca proteica',
            ingredients: [
              { name: 'Ovo', amount: '2', unit: 'un' },
              { name: 'Aveia', amount: '3', unit: 'colheres' },
            ],
          },
        },
      ],
    },
  ]

  it('extrai alimentos e ingredientes de receitas', () => {
    const entries = extractShoppingListEntries(sampleMeals, 'foods')
    assert.ok(entries.some((item) => item.name === 'Arroz branco'))
    assert.ok(entries.some((item) => item.name === 'Ovo' && item.quantity === 4))
  })

  it('escala quantidades pelo período selecionado', () => {
    assert.equal(periodScaleFactor(14), 2)
    const entries = extractShoppingListEntries(sampleMeals, 'foods')
    const scaled = aggregateShoppingEntries(entries, 14)
    const rice = scaled.find((item) => item.name === 'Arroz branco')
    assert.equal(rice.quantity, 4)
  })

  it('monta texto da lista a partir do plano', () => {
    const result = buildShoppingListFromPlan(sampleMeals, { methodology: 'foods', periodDays: 7 })
    assert.match(result.text, /Arroz branco/)
    assert.match(result.text, /Peito de frango/)
  })

  it('formata linha com quantidade e unidade', () => {
    const line = formatShoppingEntryLine({ name: 'Banana', quantity: 6, unit: 'un' })
    assert.equal(line, 'Banana — 6 un')
  })

  it('organiza localmente por categoria', () => {
    const organized = organizeShoppingListLocally([
      'Frango — 500 g',
      'Banana — 6 un',
      'Arroz — 1 kg',
    ])
    assert.ok(organized.sections.length >= 2)
    assert.match(organized.text, /## Hortifruti/)
  })

  it('converte seções em texto editável', () => {
    const text = shoppingListTextFromSections([
      { category: 'Proteínas', items: ['Frango — 500 g'] },
    ])
    assert.match(text, /## Proteínas/)
    assert.match(text, /Frango/)
  })

  it('calcula usos restantes da lista inteligente', () => {
    assert.equal(smartListRemainingUses({ smartListUses: 2 }), 3)
    assert.equal(smartListRemainingUses({ smartListUses: 5 }), 0)
  })
})
