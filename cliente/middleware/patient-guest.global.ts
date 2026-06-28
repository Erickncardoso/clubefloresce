/** Redireciona usuário já logado para fora da tela de login (evita flash). */
export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return
  if (import.meta.server) return

  const guestPaths = ['/', '/abrir']
  if (!guestPaths.includes(to.path)) return
  if (to.query.access === 'expired') return

  const { hasAuthSession } = useAuthSession()
  if (!hasAuthSession()) return

  const resolving = useState('patient-guest-resolving', () => false)
  resolving.value = true

  try {
    const { ensurePatientSession } = usePatientAuth()
    const sessionValid = await ensurePatientSession()
    if (!sessionValid) return

    const { resolvePostLoginRoute } = usePatientOnboarding()
    const nextRoute = await resolvePostLoginRoute()
    return navigateTo(nextRoute, { replace: true })
  } finally {
    resolving.value = false
  }
})
