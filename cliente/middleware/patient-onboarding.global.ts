/** Redireciona pacientes sem onboarding completo para /onboarding. */
export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  const publicPaths = ['/', '/register', '/documento']
  if (publicPaths.includes(to.path)) return

  if (import.meta.server) return

  const patientAuth = usePatientAuth()
  patientAuth.bootstrapToken()
  if (!patientAuth.getToken()) return

  const { fetchStatus, isComplete } = usePatientOnboarding()

  try {
    await fetchStatus({ force: true })
  } catch {
    if (to.path.startsWith('/onboarding')) return
    return navigateTo('/onboarding', { replace: true })
  }

  if (to.path.startsWith('/onboarding')) {
    if (isComplete.value) {
      return navigateTo('/inicio', { replace: true })
    }
    return
  }

  if (!isComplete.value) {
    return navigateTo('/onboarding', { replace: true })
  }
})
