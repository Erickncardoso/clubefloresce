/** Mantém a sessão do app paciente ativa entre aberturas do PWA. */
export default defineNuxtPlugin({
  name: 'patient-session',
  enforce: 'post',
  setup() {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  const { bootstrapToken, refreshSession, isSessionExpiredError, isPatientAccessRevokedError, clearSession } = usePatientAuth()
  const router = useRouter()

  bootstrapToken()

  const handleAuthFailure = (err: unknown) => {
    if (!isSessionExpiredError(err) && !isPatientAccessRevokedError(err)) return

    clearSession()
    const path = router.currentRoute.value.path
    if (path !== '/' && path !== '/register') {
      void navigateTo({ path: '/', query: { access: 'expired' } })
    }
  }

  const renew = () => {
    if (!bootstrapToken()) return
    void refreshSession().catch(handleAuthFailure)
  }

  renew()

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') renew()
    })
  }

  const guardedFetch = $fetch.create({
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

