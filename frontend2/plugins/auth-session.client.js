import {
  attachAuthToFetchOptions,
  isSameOriginApiRequest,
  resolveRequestUrl,
} from '~/composables/useAuthSession.js'

export default defineNuxtPlugin({
  name: 'auth-session',
  enforce: 'pre',
  setup() {
    if (import.meta.server || typeof window === 'undefined') return

    const config = useRuntimeConfig()
    const apiBase = config.public.apiBase

    const nativeFetch = window.fetch.bind(window)
    window.fetch = (input, init = {}) => {
      const url = resolveRequestUrl(input)
      if (isSameOriginApiRequest(url, apiBase)) {
        init = attachAuthToFetchOptions({ ...init })
      }
      return nativeFetch(input, init)
    }
  },
})
