import { apiFetch } from '@/lib/api'
import type { FoodItemPer100g } from './types'

export interface FoodBankItem {
  id: string
  name: string
  displayName?: string
  source?: string
  sourceCode?: string
  category?: string
  per100g: FoodItemPer100g | null
  nutrientsPer100g?: Record<string, number | null> | null
}

function round1(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(Number(value))) return null
  return Math.round(Number(value) * 10) / 10
}

export function mapFoodItemFromApi(item: Record<string, unknown> | null | undefined): FoodBankItem | null {
  if (!item) return null
  const rawPer100g = (item.per100g as Record<string, number | null>) || {
    caloriesKcal: item.caloriesKcal,
    proteinG: item.proteinG,
    carbsG: item.carbsG,
    fatG: item.fatG,
    fiberG: item.fiberG,
    sodiumMg: item.sodiumMg,
  }
  const per100g: FoodItemPer100g | null = rawPer100g
    ? {
        caloriesKcal: rawPer100g.caloriesKcal == null ? null : Math.round(Number(rawPer100g.caloriesKcal)),
        proteinG: round1(rawPer100g.proteinG),
        carbsG: round1(rawPer100g.carbsG),
        fatG: round1(rawPer100g.fatG),
        fiberG: round1(rawPer100g.fiberG),
        sodiumMg: rawPer100g.sodiumMg == null ? null : Math.round(Number(rawPer100g.sodiumMg)),
      }
    : null

  return {
    id: String(item.id || ''),
    source: String(item.source || ''),
    sourceCode: item.sourceCode != null ? String(item.sourceCode) : undefined,
    name: String(item.name || ''),
    displayName: item.displayName ? String(item.displayName) : undefined,
    category: item.category ? String(item.category) : undefined,
    per100g,
  }
}

export function formatFoodSourceLabel(source: string | undefined | null): string {
  const key = String(source || '').trim().toUpperCase()
  if (key === 'CUSTOM') return 'florescer'
  if (key === 'TBCA') return 'TBCA 7.3'
  if (key === 'TACO') return 'TACO'
  if (key === 'TABNUT') return 'TABNUT'
  if (key === 'TUCUNDUVA') return 'Tucunduva'
  return String(source || '').trim() || '—'
}

export function formatPer100gKcal(value: number | null | undefined): string {
  if (value == null || value === undefined || Number.isNaN(Number(value))) return '—'
  return String(Math.round(Number(value)))
}

const searchCache = new Map<string, FoodBankItem[]>()
const idCache = new Map<string, FoodBankItem | null>()

export async function searchFoods(query: string, limit = 20): Promise<FoodBankItem[]> {
  const cacheKey = `${String(query || '').trim().toLowerCase()}::${limit}`
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!

  try {
    const res = await apiFetch<{ items?: unknown[] }>(`/foods/search?q=${encodeURIComponent(query || '')}&limit=${limit}`)
    const items = ((res.items || []) as Record<string, unknown>[]).map(mapFoodItemFromApi).filter(Boolean) as FoodBankItem[]
    searchCache.set(cacheKey, items)
    return items
  } catch {
    return []
  }
}

export async function getFoodById(id: string): Promise<FoodBankItem | null> {
  if (!id) return null
  if (idCache.has(id)) return idCache.get(id)!
  try {
    const res = await apiFetch<{ item?: unknown }>(`/foods/${id}`)
    const item = mapFoodItemFromApi(res.item as Record<string, unknown> | null)
    idCache.set(id, item)
    return item
  } catch {
    return null
  }
}

const FAVORITES_KEY = 'cf_food_favorites'

export function loadFavoriteIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function saveFavoriteIds(ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids.slice(0, 200)))
  } catch { /* ignore */ }
}

export function toggleFavoriteId(id: string): string[] {
  const ids = loadFavoriteIds()
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids]
  saveFavoriteIds(next)
  return next
}

export function sortWithFavorites(items: FoodBankItem[], favoriteIds: string[]): FoodBankItem[] {
  const favSet = new Set(favoriteIds)
  return [...items].sort((a, b) => {
    const aFav = favSet.has(a.id) ? 0 : 1
    const bFav = favSet.has(b.id) ? 0 : 1
    return aFav - bFav
  })
}
