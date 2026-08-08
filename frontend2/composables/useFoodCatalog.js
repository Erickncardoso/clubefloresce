import { authFetchInit } from '~/composables/useAuthSession.js'
import { mapFoodItemFromApi } from '~/utils/food-bank'
import {
  clearFoodCatalog,
  readFoodCatalogItems,
  readFoodCatalogMeta,
  writeFoodCatalog,
} from '~/utils/food-catalog-db'
import {
  findLocalFoodMatch,
  findMealPlanFoodMatch,
  searchLocalFoodCatalog,
} from '~/utils/food-search-client'

const catalogState = reactive({
  ready: false,
  syncing: false,
  version: null,
  total: 0,
  syncedAt: null,
  error: null,
})

let memoryCatalog = []
let loadPromise = null
let syncPromise = null

function mapCatalogItemToFood(item) {
  if (!item) return null
  return mapFoodItemFromApi({
    id: item.id,
    source: item.source,
    sourceCode: item.sourceCode,
    name: item.name,
    displayName: item.displayName || item.name,
    category: item.category,
    per100g: item.per100g,
    nutrients: { per100g: {} },
  })
}

async function loadLocalCatalogIntoMemory() {
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    try {
      const [meta, items] = await Promise.all([
        readFoodCatalogMeta(),
        readFoodCatalogItems(),
      ])
      memoryCatalog = items
      catalogState.ready = items.length > 0
      catalogState.version = meta?.version || null
      catalogState.total = meta?.total || items.length
      catalogState.syncedAt = meta?.syncedAt || null
      catalogState.error = null
    } catch (err) {
      catalogState.ready = false
      catalogState.error = err?.message || 'Erro ao carregar catálogo local'
      memoryCatalog = []
    } finally {
      loadPromise = null
    }
  })()

  return loadPromise
}

export function useFoodCatalog() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  async function syncCatalog({ force = false } = {}) {
    if (syncPromise) return syncPromise

    syncPromise = (async () => {
      catalogState.syncing = true
      try {
        await loadLocalCatalogIntoMemory()

        let remoteMeta = null
        try {
          remoteMeta = await $fetch(`${apiBase}/foods/catalog/meta`, authFetchInit())
        } catch (err) {
          catalogState.error = err?.message || 'Erro ao verificar catálogo remoto'
          return { updated: false, offline: true }
        }

        if (!force && remoteMeta?.version && remoteMeta.version === catalogState.version && memoryCatalog.length) {
          return { updated: false, offline: false }
        }

        const remoteCatalog = await $fetch(`${apiBase}/foods/catalog`, authFetchInit())
        const items = Array.isArray(remoteCatalog?.items) ? remoteCatalog.items : []
        const version = remoteCatalog?.version || remoteMeta?.version || String(items.length)

        await writeFoodCatalog({
          version,
          items,
          syncedAt: new Date().toISOString(),
        })

        memoryCatalog = items
        catalogState.ready = items.length > 0
        catalogState.version = version
        catalogState.total = items.length
        catalogState.syncedAt = new Date().toISOString()
        catalogState.error = null

        return { updated: true, offline: false, total: items.length }
      } catch (err) {
        catalogState.error = err?.message || 'Erro ao sincronizar catálogo'
        return { updated: false, offline: false, error: catalogState.error }
      } finally {
        catalogState.syncing = false
        syncPromise = null
      }
    })()

    return syncPromise
  }

  async function ensureCatalogLoaded() {
    if (memoryCatalog.length) return memoryCatalog
    await loadLocalCatalogIntoMemory()
    return memoryCatalog
  }

  async function searchFoodsLocal(query, options = {}) {
    await ensureCatalogLoaded()
    if (!memoryCatalog.length) return null
    const { items } = searchLocalFoodCatalog(memoryCatalog, {
      q: query,
      source: options.source,
      limit: options.limit,
    })
    return items.map(mapCatalogItemToFood).filter(Boolean)
  }

  async function matchFoodLocal(name, source) {
    await ensureCatalogLoaded()
    if (!memoryCatalog.length) return null
    const item = findLocalFoodMatch(memoryCatalog, name, source)
    return mapCatalogItemToFood(item)
  }

  async function getFoodByIdLocal(id) {
    await ensureCatalogLoaded()
    if (!id || !memoryCatalog.length) return null
    const item = memoryCatalog.find((entry) => entry.id === id)
    return mapCatalogItemToFood(item)
  }

  async function matchFoodLocalForMealPlan(name) {
    await ensureCatalogLoaded()
    if (!memoryCatalog.length) return null
    const item = findMealPlanFoodMatch(memoryCatalog, name)
    return mapCatalogItemToFood(item)
  }

  async function matchFoodBatchLocal(entries) {
    await ensureCatalogLoaded()
    if (!memoryCatalog.length) return null

    const map = new Map()
    for (const entry of entries || []) {
      const key = String(entry?.key || '').trim()
      const name = String(entry?.name || '').trim()
      if (!key || !name) continue

      const matched = findMealPlanFoodMatch(memoryCatalog, name)
      map.set(key, mapCatalogItemToFood(matched))
    }

    return map
  }

  async function resetLocalCatalog() {
    await clearFoodCatalog()
    memoryCatalog = []
    catalogState.ready = false
    catalogState.version = null
    catalogState.total = 0
    catalogState.syncedAt = null
  }

  return {
    catalogState: readonly(catalogState),
    ensureCatalogLoaded,
    syncCatalog,
    searchFoodsLocal,
    matchFoodLocal,
    matchFoodLocalForMealPlan,
    getFoodByIdLocal,
    matchFoodBatchLocal,
    resetLocalCatalog,
    isCatalogReady: computed(() => catalogState.ready),
  }
}
