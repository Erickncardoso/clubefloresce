/** Mantém a sessão do app paciente ativa entre aberturas do PWA. */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  const { bootstrapToken, refreshSession } = usePatientAuth()

  bootstrapToken()

  const renew = () => {
    if (!bootstrapToken()) return
    void refreshSession()
  }

  renew()

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') renew()
    })
  }
})
