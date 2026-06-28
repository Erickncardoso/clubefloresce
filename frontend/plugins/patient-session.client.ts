/** Mantém a sessão do app paciente ativa entre aberturas do PWA. */
const PUBLIC_PATHS = ['/', '/register', '/documento', '/esqueci-senha', '/redefinir-senha', '/abrir']

export default defineNuxtPlugin({
  name: 'patient-session',
  enforce: 'post',
  setup() {
    const config = useRuntimeConfig()
    if (!config.public.mobileApp) return

    const {
      bootstrapToken,
      refreshSession,
      isSessionExpiredError,
      isPatientAccessRevokedError,
      isTransientAuthError,
      clearSession,
      assertPatientRole,
    } = usePatientAuth()
    const { readFreshLogin } = useAuthSession()
    const router = useRouter()

    bootstrapToken()

    const redirectToLogin = (err?: unknown) => {
      const path = router.currentRoute.value.path
      if (PUBLIC_PATHS.includes(path)) return

      const query = err && isPatientAccessRevokedError(err) ? { access: 'expired' } : undefined
      void navigateTo(query ? { path: '/', query } : '/')
    }

    const handleAuthFailure = (err: unknown) => {
      if (readFreshLogin()) return
      if (isTransientAuthError(err)) return
      if (!isSessionExpiredError(err) && !isPatientAccessRevokedError(err)) return

      clearSession()
      redirectToLogin(err)
    }

    /** Renova cookie em background — nunca desloga só porque o refresh falhou. */
    const renew = () => {
      if (!bootstrapToken()) return
      if (readFreshLogin() && assertPatientRole()) return

      void refreshSession().catch(handleAuthFailure)
    }

    renew()

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') renew()
      })
    }

    const guardedFetch = $fetch.create({
      credentials: 'include',
      onRequest({ options }) {
        const { authHeaders: buildAuthHeaders } = usePatientAuth()
        const headers = new Headers(options.headers as HeadersInit)
        Object.entries(buildAuthHeaders()).forEach(([key, value]) => {
          if (!headers.has(key)) headers.set(key, value)
        })
        options.headers = headers
      },
      onResponseError({ response }) {
        handleAuthFailure({
          statusCode: response.status,
          data: response._data,
        })
      },
    })

    globalThis.$fetch = guardedFetch
  },
})
