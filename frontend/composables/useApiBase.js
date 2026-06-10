import { resolveApiBaseAtRuntime } from '~/utils/resolve-api-base.mjs'

/** Base da API resolvida em tempo real (dev local usa /api via proxy do Nuxt). */
export function useApiBase() {
  const config = useRuntimeConfig()

  return computed(() => {
    const base = config.public.apiBase
    if (!import.meta.client) return base

    return resolveApiBaseAtRuntime(base, {
      mobileApp: Boolean(config.public.mobileApp),
      hostname: window.location.hostname,
    })
  })
}
