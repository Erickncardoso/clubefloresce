import { resolveApiBaseAtRuntime } from '~/utils/resolve-api-base.mjs'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  const resolved = resolveApiBaseAtRuntime(config.public.apiBase, {
    mobileApp: true,
    hostname: window.location.hostname,
  })

  if (resolved !== config.public.apiBase) {
    config.public.apiBase = resolved
  }
})
