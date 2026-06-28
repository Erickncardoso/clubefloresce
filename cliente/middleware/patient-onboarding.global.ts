/** Redireciona pacientes sem onboarding completo para /onboarding. */
export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  const publicPaths = ['/', '/register', '/documento', '/esqueci-senha', '/redefinir-senha', '/abrir']
  if (publicPaths.includes(to.path)) return

  if (import.meta.server) return

  const patientAuth = usePatientAuth()
  const sessionValid = await patientAuth.ensurePatientSession()
  if (!sessionValid) return

  const { fetchStatus, isComplete, loaded } = usePatientOnboarding()

  try {
    await fetchStatus({ force: !loaded.value })
  } catch {
    return
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
