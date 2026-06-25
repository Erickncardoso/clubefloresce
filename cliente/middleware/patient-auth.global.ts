/** Exige login de paciente nas rotas do app (preview web / PWA). */
export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  const publicPaths = ['/', '/register', '/esqueci-senha', '/redefinir-senha', '/abrir']
  if (publicPaths.includes(to.path)) return

  if (import.meta.server) return

  const { ensurePatientSession } = usePatientAuth()
  const sessionValid = await ensurePatientSession()

  if (!sessionValid) {
    return navigateTo({ path: '/', query: { access: 'expired' } })
  }
})
