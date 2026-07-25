import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  appendFoodSubstitutions,
  countSubstitutionsByType,
  createGroupSubstitution,
  createRecipeSubstitution,
  createFoodSubstitutionFromSuggestion,
  ensureStructuredSubstitutions,
  filterSelectableSubstitutionSuggestions,
  migrateOptionsToSubstitutions,
  substitutionDisplayLine,
  substitutionToParsedPlanItem,
  syncItemSubstitutionsToLegacy,
} from '../utils/meal-plan-substitutions.js'

describe('meal plan structured substitutions', () => {
  it('migra linhas legadas de options para substituições de alimento', () => {
    const item = {
      options: 'Chá mate - 1 xícara (200ml)\nOmelete - 2 unidade(s) (100g)',
    }
    const subs = migrateOptionsToSubstitutions(item)
    assert.equal(subs.length, 2)
    assert.equal(subs[0].type, 'food')
    assert.match(substitutionDisplayLine(subs[0]), /Chá mate/)
  })

  it('conta substituições por tipo', () => {
    const item = {
      substitutions: [
        { id: '1', type: 'food', name: 'Banana' },
        { id: '2', type: 'group', groupId: 'fruit', groupLabel: 'Fruta', amount: '1', unit: 'porção' },
        { id: '3', type: 'recipe', name: 'Panqueca', amount: '1', servingLabel: '1 porção' },
      ],
    }
    const counts = countSubstitutionsByType(item)
    assert.equal(counts.food, 1)
    assert.equal(counts.group, 1)
    assert.equal(counts.recipe, 1)
    assert.equal(counts.total, 3)
  })

  it('sincroniza options legado a partir das substituições estruturadas', () => {
    const item = {
      substitutions: [
        createGroupSubstitution('carbs'),
        createRecipeSubstitution({ id: 'r1', title: 'Overnight oats', servingsLabel: '1 porção' }),
      ],
    }
    syncItemSubstitutionsToLegacy(item)
    assert.match(item.options, /Carboidrato/)
    assert.match(item.options, /Overnight oats/)
  })

  it('exporta substituições tipadas para o plano publicado', () => {
    const item = {
      substitutions: [createGroupSubstitution('protein')],
    }
    ensureStructuredSubstitutions(item)
    const parsed = substitutionToParsedPlanItem(item.substitutions[0])
    assert.equal(parsed.substitutionType, 'group')
    assert.equal(parsed.groupId, 'protein')
    assert.match(parsed.display, /Proteína magra/)
  })

  it('adiciona múltiplos substitutos de alimento em lote sem duplicar', () => {
    const item = {
      substitutions: [
        createFoodSubstitutionFromSuggestion({
          id: 'food-1',
          name: 'Aveia em flocos',
          grams: 40,
          per100g: { caloriesKcal: 380, proteinG: 14, carbsG: 66, fatG: 7 },
        }),
      ],
    }
    const added = appendFoodSubstitutions(item, [
      {
        id: 'food-2',
        name: 'Granola',
        grams: 35,
        per100g: { caloriesKcal: 420, proteinG: 10, carbsG: 64, fatG: 12 },
      },
      {
        id: 'food-1',
        name: 'Aveia em flocos',
        grams: 40,
        per100g: { caloriesKcal: 380, proteinG: 14, carbsG: 66, fatG: 7 },
      },
      {
        id: 'food-3',
        name: 'Tapioca',
        grams: 50,
        per100g: { caloriesKcal: 360, proteinG: 0.2, carbsG: 88, fatG: 0.2 },
      },
    ])
    assert.equal(added, 2)
    assert.equal(countSubstitutionsByType(item).food, 3)
    assert.match(substitutionDisplayLine(item.substitutions[2]), /Tapioca/)
  })

  it('filtra sugestões já adicionadas na seleção múltipla', () => {
    const existing = [
      createFoodSubstitutionFromSuggestion({ id: 'food-1', name: 'Aveia', grams: 40, per100g: {} }),
    ]
    const selectable = filterSelectableSubstitutionSuggestions(existing, [
      { id: 'food-1', name: 'Aveia', grams: 40 },
      { id: 'food-2', name: 'Granola', grams: 35 },
    ])
    assert.equal(selectable.length, 1)
    assert.equal(selectable[0].id, 'food-2')
  })
})
