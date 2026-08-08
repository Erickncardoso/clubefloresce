import { hasAuthSession } from '~/composables/useAuthSession.js'

/** Sincroniza a base TBCA/TACO no IndexedDB para busca offline e instantânea. */
export default defineNuxtPlugin({
  name: 'food-catalog-sync',
  dependsOn: ['auth-session-bootstrap'],
  async setup() {
    if (import.meta.server || typeof window === 'undefined') return
    if (!hasAuthSession()) return

    const { ensureCatalogLoaded, syncCatalog } = useFoodCatalog()

    // Carrega cache local imediatamente (busca instantânea se já sincronizou antes).
    ensureCatalogLoaded().catch(() => {})

    // Atualiza em background quando online; não bloqueia a UI.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return

    syncCatalog().catch(() => {})

    window.addEventListener('online', () => {
      syncCatalog().catch(() => {})
    })
  },
})
