/** Rotas autenticadas do app paciente — exige sessão válida com role PACIENTE. */
export default defineNuxtRouteMiddleware(async () => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return
  if (import.meta.server) return

  const { ensurePatientSession } = usePatientAuth()
  const sessionValid = await ensurePatientSession()

  if (!sessionValid) {
    return navigateTo('/')
  }
})
