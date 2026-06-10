import { resolveApiBaseAtRuntime } from '~/utils/resolve-api-base.mjs'

export default defineNuxtPlugin({
  name: 'api-base',
  enforce: 'pre',
  setup() {
    const config = useRuntimeConfig()

    const resolved = resolveApiBaseAtRuntime(config.public.apiBase, {
      mobileApp: Boolean(config.public.mobileApp),
      hostname: window.location.hostname,
    })

    if (resolved !== config.public.apiBase) {
      config.public.apiBase = resolved
    }
  },
})
