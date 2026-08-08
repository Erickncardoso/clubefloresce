import type { MealEntry } from './types'

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

const LOCAL_CATEGORY_KEYWORDS: Record<string, string[]> = {
  hortifruti: ['alface', 'tomate', 'banana', 'maçã', 'maca', 'cenoura', 'abobrinha', 'couve', 'brócolis', 'brocolis', 'salada', 'fruta', 'legume', 'vegetal', 'mamão', 'mamao', 'morango', 'abacate', 'limão', 'limao', 'cebola', 'alho', 'batata', 'mandioca', 'inhame'],
  proteinas: ['frango', 'carne', 'peixe', 'ovo', 'ovos', 'atum', 'salmão', 'salmao', 'tilápia', 'tilapia', 'camarão', 'camarao', 'tofu', 'proteína', 'proteina', 'peito', 'sardinha'],
  laticinios: ['leite', 'iogurte', 'queijo', 'requeijão', 'requeijao', 'manteiga', 'creme', 'laticínio', 'laticinio'],
  mercearia: ['arroz', 'feijão', 'feijao', 'macarrão', 'macarrao', 'aveia', 'granola', 'pão', 'pao', 'farinha', 'açúcar', 'acucar', 'óleo', 'oleo', 'azeite', 'café', 'cafe', 'chá', 'cha', 'biscoito', 'castanha', 'amendoim'],
  congelados: ['congelado', 'frozen', 'sorvete'],
}

export interface ShoppingList {
  title: string
  periodDays: number
  customText: string
  smartListUses: number
  isSmartOrganized: boolean
  generatedAt: string | null
}

export function createEmptyShoppingList(): ShoppingList {
  return {
    title: 'Lista de Compras',
    periodDays: 7,
    customText: '',
    smartListUses: 0,
    isSmartOrganized: false,
    generatedAt: null,
  }
}

export function normalizeShoppingList(value: Partial<ShoppingList> | null | undefined): ShoppingList {
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

function normalizeKey(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function parseAmount(value: string | number | null | undefined): number | null {
  const raw = String(value ?? '').trim().replace(',', '.')
  if (!raw) return null
  const num = Number(raw)
  return Number.isFinite(num) && num > 0 ? num : null
}

function formatQuantity(value: number): string {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return ''
  if (Math.abs(num - Math.round(num)) < 0.05) return String(Math.round(num))
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

interface ShoppingEntry {
  key: string
  name: string
  quantity: number
  unit: string
  grams: number | null
  source: string
  groupLabel?: string | null
  recipeTitle?: string
}

export function extractShoppingListEntries(meals: MealEntry[], methodology = 'foods'): ShoppingEntry[] {
  const entries: ShoppingEntry[] = []

  for (const meal of meals || []) {
    for (const item of meal.items || []) {
      if (methodology === 'equivalents') {
        const options = String(item.options || '').split(/\r?\n|,/).map((p) => p.trim()).filter(Boolean)
        const quantity = parseAmount(item.amount) || 1
        const unit = item.unit || 'porção'
        if (options.length) {
          for (const option of options) {
            entries.push({ key: normalizeKey(option), name: option, quantity, unit, grams: null, source: 'group', groupLabel: item.name || null })
          }
        } else {
          const name = String(item.name || '').trim()
          if (!name) continue
          entries.push({ key: normalizeKey(name), name, quantity, unit, grams: null, source: 'group', groupLabel: name })
        }
        continue
      }

      if (item.itemType === 'recipe' || item.recipeSnapshot) {
        const portions = parseAmount(item.amount) || 1
        const recipe = item.recipeSnapshot
        const ingredients = (recipe?.ingredients as Array<{ name?: string; amount?: string | number; unit?: string; grams?: number }>) || []
        if (ingredients.length) {
          for (const ingredient of ingredients) {
            const name = String(ingredient.name || '').trim()
            if (!name) continue
            const ingQty = parseAmount(ingredient.amount) || 1
            entries.push({ key: normalizeKey(name), name, quantity: ingQty * portions, unit: ingredient.unit || 'unidade', grams: ingredient.grams != null ? Number(ingredient.grams) * portions : null, source: 'recipe', recipeTitle: recipe?.title || item.name })
          }
        } else {
          const name = String(item.name || recipe?.title || '').trim()
          if (!name) continue
          entries.push({ key: normalizeKey(name), name, quantity: portions, unit: item.unit || recipe?.servingsLabel || 'porção', grams: null, source: 'recipe', recipeTitle: recipe?.title || name })
        }
        continue
      }

      const name = String(item.name || item.display || '').trim()
      if (!name) continue
      entries.push({ key: normalizeKey(name), name, quantity: parseAmount(item.amount) || 1, unit: item.unit || item.portionMeasure || 'porção', grams: item.grams != null ? Number(item.grams) : null, source: 'food' })
    }
  }

  return entries
}

export function aggregateShoppingEntries(entries: ShoppingEntry[], periodDays = 7): ShoppingEntry[] {
  const factor = Math.max(1, Number(periodDays) || 7) / 7
  const map = new Map<string, ShoppingEntry>()

  for (const entry of entries || []) {
    const unitKey = String(entry.unit || '').trim().toLowerCase()
    const mapKey = `${entry.key}::${unitKey}`
    const existing = map.get(mapKey)
    const scaledQty = (Number(entry.quantity) || 1) * factor
    const scaledGrams = entry.grams != null ? Number(entry.grams) * factor : null

    if (!existing) {
      map.set(mapKey, { ...entry, quantity: scaledQty, grams: scaledGrams })
      continue
    }
    existing.quantity = (Number(existing.quantity) || 0) + scaledQty
    if (scaledGrams != null) existing.grams = (Number(existing.grams) || 0) + scaledGrams
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

function formatShoppingEntryLine(entry: ShoppingEntry): string {
  const qty = formatQuantity(entry.quantity)
  const unit = String(entry.unit || '').trim()
  const grams = entry.grams != null && Number(entry.grams) > 0 ? ` (${Math.round(Number(entry.grams))}g)` : ''
  if (qty && unit) return `${entry.name} — ${qty} ${unit}${grams}`
  if (qty) return `${entry.name} — ${qty}${grams}`
  return `${entry.name}${grams}`
}

export function buildShoppingListFromPlan(meals: MealEntry[], { methodology = 'foods', periodDays = 7 } = {}): { entries: ShoppingEntry[]; text: string } {
  const entries = aggregateShoppingEntries(extractShoppingListEntries(meals, methodology), periodDays)
  return { entries, text: entries.map((e) => formatShoppingEntryLine(e)).join('\n') }
}

export function smartListRemainingUses(shoppingList: Partial<ShoppingList> | null | undefined): number {
  const normalized = normalizeShoppingList(shoppingList)
  return Math.max(0, SHOPPING_LIST_SMART_LIMIT - normalized.smartListUses)
}

export function guessLocalCategory(name: string): string {
  const key = normalizeKey(name)
  for (const [categoryId, keywords] of Object.entries(LOCAL_CATEGORY_KEYWORDS)) {
    if (keywords.some((word) => key.includes(word))) return categoryId
  }
  return 'outros'
}

interface Section { category: string; items: string[] }

export function organizeShoppingListLocally(lines: string[]): { sections: Section[]; text: string } {
  const buckets: Record<string, string[]> = Object.fromEntries(
    SHOPPING_LIST_LOCAL_CATEGORIES.map((cat) => [cat.id, []]),
  )
  for (const rawLine of lines || []) {
    const line = String(rawLine || '').trim()
    if (!line || line.startsWith('## ')) continue
    const categoryId = guessLocalCategory(line)
    buckets[categoryId].push(line)
  }
  const sections = SHOPPING_LIST_LOCAL_CATEGORIES
    .map((cat) => ({ category: cat.label, items: buckets[cat.id] }))
    .filter((s) => s.items.length)
  const text = sections.map((s) => [`## ${s.category}`, ...s.items].join('\n')).join('\n\n')
  return { sections, text }
}
