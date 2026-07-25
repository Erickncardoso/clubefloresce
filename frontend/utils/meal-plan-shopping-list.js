import { findEquivalentGroup } from './meal-plan-equivalent-groups.js'

function isRecipeMealItem(item) {
  return item?.itemType === 'recipe' || Boolean(item?.recipeId || item?.recipeSnapshot)
}

export const SHOPPING_LIST_PERIODS = [
  { id: 3, label: '3 dias' },
  { id: 7, label: '7 dias' },
  { id: 15, label: '15 dias' },
  { id: 30, label: '30 dias' },
]

export const SHOPPING_LIST_SMART_LIMIT = 5

export const SHOPPING_LIST_LOCAL_CATEGORIES = [
  { id: 'hortifruti', label: 'Hortifruti' },
  { id: 'proteinas', label: 'Proteínas' },
  { id: 'laticinios', label: 'Laticínios' },
  { id: 'mercearia', label: 'Mercearia' },
  { id: 'congelados', label: 'Congelados' },
  { id: 'outros', label: 'Outros' },
]

const LOCAL_CATEGORY_KEYWORDS = {
  hortifruti: ['alface', 'tomate', 'banana', 'maçã', 'maca', 'cenoura', 'abobrinha', 'couve', 'brócolis', 'brocolis', 'salada', 'fruta', 'legume', 'vegetal', 'mamão', 'mamao', 'morango', 'abacate', 'limão', 'limao', 'cebola', 'alho', 'batata', 'mandioca', 'inhame'],
  proteinas: ['frango', 'carne', 'peixe', 'ovo', 'ovos', 'atum', 'salmão', 'salmao', 'tilápia', 'tilapia', 'camarão', 'camarao', 'tofu', 'proteína', 'proteina', 'peito', 'sardinha'],
  laticinios: ['leite', 'iogurte', 'queijo', 'requeijão', 'requeijao', 'manteiga', 'creme', 'laticínio', 'laticinio'],
  mercearia: ['arroz', 'feijão', 'feijao', 'macarrão', 'macarrao', 'aveia', 'granola', 'pão', 'pao', 'farinha', 'açúcar', 'acucar', 'óleo', 'oleo', 'azeite', 'café', 'cafe', 'chá', 'cha', 'biscoito', 'castanha', 'amendoim'],
  congelados: ['congelado', 'frozen', 'sorvete'],
}

export function createEmptyShoppingList() {
  return {
    title: 'Lista de Compras',
    periodDays: 7,
    customText: '',
    smartListUses: 0,
    isSmartOrganized: false,
    generatedAt: null,
  }
}

export function normalizeShoppingList(value) {
  const base = createEmptyShoppingList()
  if (!value || typeof value !== 'object') return { ...base }

  const periodDays = Number(value.periodDays)
  const allowed = SHOPPING_LIST_PERIODS.map((item) => item.id)
  const smartListUses = Math.max(0, Math.min(SHOPPING_LIST_SMART_LIMIT, Number(value.smartListUses) || 0))

  return {
    title: String(value.title || base.title).trim() || base.title,
    periodDays: allowed.includes(periodDays) ? periodDays : base.periodDays,
    customText: String(value.customText ?? base.customText),
    smartListUses,
    isSmartOrganized: value.isSmartOrganized === true,
    generatedAt: value.generatedAt || null,
  }
}

function normalizeKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function parseAmount(value) {
  const raw = String(value ?? '').trim().replace(',', '.')
  if (!raw) return null
  const num = Number(raw)
  return Number.isFinite(num) && num > 0 ? num : null
}

function formatQuantity(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return ''
  if (Math.abs(num - Math.round(num)) < 0.05) return String(Math.round(num))
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

function splitItemOptions(item) {
  const fromOptions = String(item?.options || '')
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (fromOptions.length) return fromOptions

  if (Array.isArray(item?.substitutions) && item.substitutions.length) {
    return item.substitutions
      .map((sub) => String(sub?.display || sub?.name || '').trim())
      .filter(Boolean)
  }

  return []
}

export function extractShoppingListEntries(meals, methodology = 'foods') {
  const entries = []

  for (const meal of meals || []) {
    for (const item of meal.items || []) {
      if (methodology === 'equivalents') {
        const group = findEquivalentGroup(item.groupId)
        const options = splitItemOptions(item)
        const quantity = parseAmount(item.amount) || 1
        const unit = item.unit || 'porção'

        if (options.length) {
          for (const option of options) {
            entries.push({
              key: normalizeKey(option),
              name: option,
              quantity,
              unit,
              source: 'group',
              groupLabel: group?.label || null,
            })
          }
        } else {
          const name = group?.label || String(item.name || '').trim()
          if (!name) continue
          entries.push({
            key: normalizeKey(name),
            name,
            quantity,
            unit,
            source: 'group',
            groupLabel: group?.label || name,
          })
        }
        continue
      }

      if (isRecipeMealItem(item)) {
        const portions = parseAmount(item.amount) || 1
        const recipe = item.recipeSnapshot
        const ingredients = recipe?.ingredients || []

        if (ingredients.length) {
          for (const ingredient of ingredients) {
            const name = String(ingredient.name || '').trim()
            if (!name) continue
            const ingQty = parseAmount(ingredient.amount) || 1
            entries.push({
              key: normalizeKey(name),
              name,
              quantity: ingQty * portions,
              unit: ingredient.unit || 'unidade',
              grams: ingredient.grams != null ? Number(ingredient.grams) * portions : null,
              source: 'recipe',
              recipeTitle: recipe?.title || item.name,
            })
          }
        } else {
          const name = String(item.name || recipe?.title || '').trim()
          if (!name) continue
          entries.push({
            key: normalizeKey(name),
            name,
            quantity: portions,
            unit: item.unit || recipe?.servingsLabel || 'porção',
            source: 'recipe',
            recipeTitle: recipe?.title || name,
          })
        }
        continue
      }

      const name = String(item.name || item.display || '').trim()
      if (!name) continue
      entries.push({
        key: normalizeKey(name),
        name,
        quantity: parseAmount(item.amount) || 1,
        unit: item.unit || item.portionMeasure || 'porção',
        grams: item.grams != null ? Number(item.grams) : null,
        source: 'food',
      })
    }
  }

  return entries
}

export function periodScaleFactor(periodDays, baseDays = 7) {
  const period = Math.max(1, Number(periodDays) || baseDays)
  return period / baseDays
}

export function aggregateShoppingEntries(entries, periodDays = 7) {
  const factor = periodScaleFactor(periodDays)
  const map = new Map()

  for (const entry of entries || []) {
    const unitKey = String(entry.unit || '').trim().toLowerCase()
    const mapKey = `${entry.key}::${unitKey}`
    const existing = map.get(mapKey)
    const scaledQty = (Number(entry.quantity) || 1) * factor
    const scaledGrams = entry.grams != null ? Number(entry.grams) * factor : null

    if (!existing) {
      map.set(mapKey, {
        ...entry,
        quantity: scaledQty,
        grams: scaledGrams,
      })
      continue
    }

    existing.quantity = (Number(existing.quantity) || 0) + scaledQty
    if (scaledGrams != null) {
      existing.grams = (Number(existing.grams) || 0) + scaledGrams
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export function formatShoppingEntryLine(entry) {
  const qty = formatQuantity(entry.quantity)
  const unit = String(entry.unit || '').trim()
  const grams = entry.grams != null && Number(entry.grams) > 0
    ? ` (${Math.round(Number(entry.grams))}g)`
    : ''

  if (qty && unit) return `${entry.name} — ${qty} ${unit}${grams}`
  if (qty) return `${entry.name} — ${qty}${grams}`
  return `${entry.name}${grams}`
}

export function shoppingListTextFromEntries(entries) {
  return (entries || []).map((entry) => formatShoppingEntryLine(entry)).join('\n')
}

export function buildShoppingListFromPlan(meals, { methodology = 'foods', periodDays = 7 } = {}) {
  const entries = aggregateShoppingEntries(
    extractShoppingListEntries(meals, methodology),
    periodDays,
  )
  return {
    entries,
    text: shoppingListTextFromEntries(entries),
  }
}

export function buildShoppingListItems(meals, customText = '', options = {}) {
  if (String(customText || '').trim()) {
    return String(customText)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  }

  return buildShoppingListFromPlan(meals, options).entries.map((entry) => formatShoppingEntryLine(entry))
}

export function shoppingListTextFromItems(items) {
  return (items || []).join('\n')
}

export function formatShoppingItemCount(count) {
  const total = Math.max(0, Number(count) || 0)
  return total === 1 ? '1 item' : `${total} itens`
}

export function smartListRemainingUses(shoppingList) {
  const normalized = normalizeShoppingList(shoppingList)
  return Math.max(0, SHOPPING_LIST_SMART_LIMIT - normalized.smartListUses)
}

export function guessLocalCategory(name) {
  const key = normalizeKey(name)
  for (const [categoryId, keywords] of Object.entries(LOCAL_CATEGORY_KEYWORDS)) {
    if (keywords.some((word) => key.includes(word))) return categoryId
  }
  return 'outros'
}

export function organizeShoppingListLocally(lines) {
  const buckets = Object.fromEntries(SHOPPING_LIST_LOCAL_CATEGORIES.map((cat) => [cat.id, []]))

  for (const rawLine of lines || []) {
    const line = String(rawLine || '').trim()
    if (!line || line.startsWith('## ')) continue
    const categoryId = guessLocalCategory(line)
    buckets[categoryId].push(line)
  }

  const sections = SHOPPING_LIST_LOCAL_CATEGORIES
    .map((cat) => ({
      category: cat.label,
      items: buckets[cat.id],
    }))
    .filter((section) => section.items.length)

  return {
    sections,
    text: shoppingListTextFromSections(sections),
  }
}

export function shoppingListTextFromSections(sections) {
  return (sections || [])
    .filter((section) => section.items?.length)
    .map((section) => [`## ${section.category}`, ...section.items].join('\n'))
    .join('\n\n')
}

export function parseShoppingListSections(text) {
  const lines = String(text || '').split('\n')
  const sections = []
  let current = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith('## ')) {
      current = { category: line.slice(3).trim(), items: [] }
      sections.push(current)
      continue
    }
    if (!current) {
      current = { category: 'Itens', items: [] }
      sections.push(current)
    }
    current.items.push(line)
  }

  return sections
}

export function flattenShoppingListText(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('## '))
}
