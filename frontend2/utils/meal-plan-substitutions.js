import {
  findEquivalentGroup,
  formatPortionUnit,
} from './meal-plan-equivalent-groups.js'

export const SUBSTITUTION_TYPES = ['food', 'group', 'recipe']

function formatFoodDisplay(item) {
  const name = String(item?.name || '').trim()
  const amount = String(item?.amount || '').trim()
  const unit = String(item?.unit || '').trim()
  if (item?.display?.trim()) return item.display.trim()
  if (!name) return ''
  return amount ? `${name} - ${amount} ${unit}`.trim() : name
}

function foodItemPortionLabel(item) {
  const amount = String(item?.amount || '').trim()
  const unit = String(item?.unit || '').trim()
  if (amount && unit) return `${amount} ${unit}`
  if (item?.grams != null) return `${item.grams}g`
  if (item?.ml != null) return `${item.ml}ml`
  return ''
}

function snapshotRecipeForSubstitution(recipe) {
  if (!recipe) return null
  return {
    id: recipe.id,
    title: recipe.title,
    imageUrl: recipe.imageUrl || null,
    imagePosition: recipe.imagePosition || '50% 50%',
    servingsLabel: recipe.servingsLabel || '1 porção',
    prepMinutes: recipe.prepMinutes ?? null,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((item) => ({ ...item })) : [],
    steps: recipe.steps || '',
    macros: recipe.macros || null,
  }
}

export function createSubstitutionId() {
  return crypto.randomUUID()
}

export function createFoodSubstitution() {
  return {
    id: createSubstitutionId(),
    type: 'food',
    foodId: '',
    linkedFoodName: '',
    foodSource: '',
    name: '',
    amount: '1',
    unit: '',
    display: '',
    grams: null,
    ml: null,
    per100g: null,
    portionAmount: 1,
    portionMeasure: 'unidade',
  }
}

export function createGroupSubstitution(groupId = 'carbs') {
  const group = findEquivalentGroup(groupId) || findEquivalentGroup('other')
  return {
    id: createSubstitutionId(),
    type: 'group',
    groupId: group?.id || groupId,
    groupLabel: group?.label || 'Grupo alimentar',
    groupExamples: group?.examples || '',
    name: group?.label || 'Grupo alimentar',
    amount: '1',
    unit: formatPortionUnit('1'),
  }
}

export function createRecipeSubstitution(recipe = null) {
  const snapshot = recipe ? snapshotRecipeForSubstitution(recipe) : null
  return {
    id: createSubstitutionId(),
    type: 'recipe',
    recipeId: recipe?.id || '',
    recipeSnapshot: snapshot,
    name: recipe?.title || 'Receita',
    amount: '1',
    unit: recipe?.servingsLabel || 'porção',
    servingLabel: recipe?.servingsLabel || '1 porção',
    portionAmount: 1,
  }
}

export function normalizeSubstitution(entry) {
  if (!entry || typeof entry !== 'object') return createFoodSubstitution()
  const type = SUBSTITUTION_TYPES.includes(entry.type) ? entry.type : 'food'
  if (type === 'group') {
    const group = findEquivalentGroup(entry.groupId)
    return {
      ...createGroupSubstitution(entry.groupId || group?.id || 'other'),
      ...entry,
      id: entry.id || createSubstitutionId(),
      type: 'group',
      groupId: entry.groupId || group?.id || 'other',
      groupLabel: entry.groupLabel || group?.label || entry.name || 'Grupo alimentar',
      groupExamples: entry.groupExamples || group?.examples || '',
      name: entry.groupLabel || group?.label || entry.name || 'Grupo alimentar',
      amount: String(entry.amount ?? '1'),
      unit: entry.unit || formatPortionUnit(entry.amount),
    }
  }
  if (type === 'recipe') {
    return {
      ...createRecipeSubstitution(),
      ...entry,
      id: entry.id || createSubstitutionId(),
      type: 'recipe',
      recipeId: entry.recipeId || entry.recipeSnapshot?.id || '',
      recipeSnapshot: entry.recipeSnapshot || null,
      name: entry.recipeSnapshot?.title || entry.name || 'Receita',
      amount: String(entry.amount ?? '1'),
      unit: entry.unit || entry.recipeSnapshot?.servingsLabel || 'porção',
      servingLabel: entry.servingLabel || entry.recipeSnapshot?.servingsLabel || '1 porção',
      portionAmount: Number(entry.portionAmount) || Number(entry.amount) || 1,
    }
  }
  return {
    ...createFoodSubstitution(),
    ...entry,
    id: entry.id || createSubstitutionId(),
    type: 'food',
    name: entry.name || '',
    amount: String(entry.amount ?? '1'),
    unit: entry.unit || '',
    portionAmount: entry.portionAmount ?? (Number(entry.amount) || 1),
    portionMeasure: entry.portionMeasure || 'unidade',
  }
}

function parseLegacyOptionLine(line) {
  const trimmed = String(line || '').trim()
  if (!trimmed) return null
  const dashMatch = trimmed.match(/^(.+?)\s-\s(\d+(?:[.,]\d+)?)\s(.+)$/i)
  if (dashMatch) {
    return normalizeSubstitution({
      type: 'food',
      name: dashMatch[1].trim(),
      amount: dashMatch[2].replace(',', '.'),
      unit: dashMatch[3].trim(),
      display: trimmed,
    })
  }
  return normalizeSubstitution({
    type: 'food',
    name: trimmed,
    display: trimmed,
  })
}

export function migrateOptionsToSubstitutions(item) {
  const fromOptions = String(item?.options || '')
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (!fromOptions.length) {
    return (item?.substitutions || []).map(normalizeSubstitution)
  }

  return fromOptions.map(parseLegacyOptionLine).filter(Boolean)
}

export function ensureStructuredSubstitutions(item) {
  if (!item || typeof item !== 'object') return []
  if (!Array.isArray(item.substitutions) || !item.substitutions.length) {
    item.substitutions = migrateOptionsToSubstitutions(item)
  } else {
    item.substitutions = item.substitutions.map(normalizeSubstitution)
  }
  return item.substitutions
}

export function substitutionDisplayLine(sub) {
  const normalized = normalizeSubstitution(sub)
  if (normalized.type === 'group') {
    const amount = String(normalized.amount || '1').trim()
    const unit = String(normalized.unit || formatPortionUnit(amount)).trim()
    return `${normalized.groupLabel || normalized.name} - ${amount} ${unit}`.trim()
  }
  if (normalized.type === 'recipe') {
    const title = normalized.recipeSnapshot?.title || normalized.name || 'Receita'
    const amount = String(normalized.amount || '1').trim()
    const label = normalized.servingLabel || normalized.recipeSnapshot?.servingsLabel || 'porção'
    return `${title} - ${amount} ${label}`.trim()
  }
  if (normalized.display?.trim()) return normalized.display.trim()
  return formatFoodDisplay(normalized) || normalized.name || ''
}

export function substitutionTypeLabel(type) {
  if (type === 'group') return 'Grupo alimentar'
  if (type === 'recipe') return 'Receita'
  return 'Alimento'
}

export function countSubstitutionsByType(item) {
  const subs = ensureStructuredSubstitutions(item)
  return {
    food: subs.filter((sub) => (sub.type || 'food') === 'food').length,
    group: subs.filter((sub) => sub.type === 'group').length,
    recipe: subs.filter((sub) => sub.type === 'recipe').length,
    total: subs.length,
  }
}

export function syncItemSubstitutionsToLegacy(item) {
  if (!item || typeof item !== 'object') return
  const lines = ensureStructuredSubstitutions(item)
    .map(substitutionDisplayLine)
    .filter(Boolean)
  item.options = lines.join('\n')
}

export function applyFoodToSubstitution(sub, food) {
  if (!sub || !food) return sub
  sub.type = 'food'
  sub.foodId = food.id || ''
  sub.linkedFoodName = food.displayName || food.name || ''
  sub.foodSource = food.source || ''
  sub.name = food.displayName || food.name || ''
  sub.per100g = food.per100g || null
  if (!sub.grams) {
    sub.portionAmount = 1
    sub.portionMeasure = 'porcao_media'
    sub.grams = 100
    sub.amount = '1'
    sub.unit = 'Porção média'
  }
  sub.display = sub.name?.trim()
    ? `${sub.name.trim()} ${foodItemPortionLabel(sub) || ''}`.trim()
    : sub.name
  return sub
}

export function applyRecipeToSubstitution(sub, recipe) {
  if (!sub || !recipe) return sub
  const normalized = createRecipeSubstitution(recipe)
  Object.assign(sub, normalized, { id: sub.id || normalized.id })
  return sub
}

export function applyGroupToSubstitution(sub, groupId) {
  if (!sub) return sub
  const normalized = createGroupSubstitution(groupId)
  Object.assign(sub, normalized, { id: sub.id || normalized.id })
  return sub
}

export function substitutionFoodIdentity(sub) {
  const normalized = normalizeSubstitution(sub)
  if ((normalized.type || 'food') !== 'food') return ''
  if (normalized.foodId) return `id:${normalized.foodId}`
  const name = String(normalized.name || normalized.linkedFoodName || '').trim().toLowerCase()
  return name ? `name:${name}` : ''
}

export function isDuplicateFoodSubstitution(existingSubs, candidate) {
  const identity = typeof candidate === 'string'
    ? candidate
    : substitutionFoodIdentity(candidate)
  if (!identity) return false
  return (existingSubs || []).some((sub) => substitutionFoodIdentity(sub) === identity)
}

export function mapSubstitutionSuggestionToFood(suggestion) {
  if (!suggestion) return null
  return {
    id: suggestion.id,
    name: suggestion.name,
    displayName: suggestion.name,
    source: suggestion.source || null,
    per100g: suggestion.per100g || null,
  }
}

export function createFoodSubstitutionFromSuggestion(suggestion) {
  const sub = createFoodSubstitution()
  const food = mapSubstitutionSuggestionToFood(suggestion)
  if (!food) return sub
  applyFoodToSubstitution(sub, food)
  const grams = Math.max(1, Math.round(Number(suggestion.grams) || 100))
  sub.grams = grams
  sub.ml = null
  sub.portionAmount = grams
  sub.portionMeasure = 'grams'
  sub.amount = String(grams)
  sub.unit = 'Gramas'
  sub.display = `${sub.name} - ${grams} Gramas`.trim()
  return sub
}

export function appendFoodSubstitutions(item, suggestions = []) {
  ensureStructuredSubstitutions(item)
  let added = 0
  for (const suggestion of suggestions) {
    const sub = createFoodSubstitutionFromSuggestion(suggestion)
    const identity = substitutionFoodIdentity(sub)
    if (!identity || isDuplicateFoodSubstitution(item.substitutions, identity)) continue
    item.substitutions.push(sub)
    added += 1
  }
  return added
}

export function suggestionFoodIdentity(suggestion) {
  if (!suggestion?.id) return ''
  return `id:${suggestion.id}`
}

export function filterSelectableSubstitutionSuggestions(existingSubs, suggestions = []) {
  const addedIds = new Set(
    (existingSubs || [])
      .map(substitutionFoodIdentity)
      .filter(Boolean),
  )
  return suggestions.filter((suggestion) => {
    const id = suggestionFoodIdentity(suggestion)
    return id && !addedIds.has(id)
  })
}

export function substitutionToParsedPlanItem(sub) {
  const normalized = normalizeSubstitution(sub)
  const display = substitutionDisplayLine(normalized)
  const base = {
    key: normalized.id,
    name: normalized.name || display,
    amount: normalized.amount ? Number(String(normalized.amount).replace(',', '.')) : null,
    unit: normalized.unit || '',
    grams: normalized.grams ?? null,
    ml: normalized.ml ?? null,
    display,
    substitutions: [],
    foodId: normalized.foodId || null,
    foodSource: normalized.foodSource || null,
    linkedFoodName: normalized.linkedFoodName || null,
    per100g: normalized.per100g || null,
    substitutionType: normalized.type || 'food',
    note: normalized.type === 'group'
      ? (normalized.groupExamples || substitutionTypeLabel('group'))
      : (normalized.type === 'recipe' ? substitutionTypeLabel('recipe') : ''),
  }

  if (normalized.type === 'recipe') {
    return {
      ...base,
      itemType: 'recipe',
      recipeId: normalized.recipeId || normalized.recipeSnapshot?.id || null,
      recipe: normalized.recipeSnapshot || null,
      name: normalized.recipeSnapshot?.title || base.name,
      display,
    }
  }

  if (normalized.type === 'group') {
    return {
      ...base,
      groupId: normalized.groupId || null,
      name: normalized.groupLabel || base.name,
    }
  }

  return base
}

export function buildSubstitutionsForParsedPlan(item) {
  ensureStructuredSubstitutions(item)
  if (item.substitutions?.length) {
    return item.substitutions.map(substitutionToParsedPlanItem)
  }
  return []
}
