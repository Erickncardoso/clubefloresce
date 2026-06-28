import { authHeaders } from '~/composables/useAuthSession.js'

/** $fetch autenticado no painel admin (cookie httpOnly + credentials). */
export default defineNuxtPlugin({
  name: 'auth-fetch',
  enforce: 'post',
  setup() {
    if (import.meta.server || typeof window === 'undefined') return

    const config = useRuntimeConfig()
    if (config.public.mobileApp) return

    const authFetch = $fetch.create({
      credentials: 'include',
      onRequest({ options }) {
        options.headers = authHeaders(options.headers as HeadersInit)
      },
    })

    globalThis.$fetch = authFetch
  },
})
