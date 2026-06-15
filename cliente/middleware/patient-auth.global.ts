/** Exige login nas rotas do app do paciente (preview web / PWA). */
export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  const publicPaths = ['/', '/register']
  if (publicPaths.includes(to.path)) return

  if (import.meta.server) return

  const { getToken, bootstrapToken, ensureSession } = usePatientAuth()
  bootstrapToken()
  if (!getToken()) return navigateTo('/')

  const sessionValid = await ensureSession()
  if (!sessionValid) {
    return navigateTo({ path: '/', query: { access: 'expired' } })
  }
})
