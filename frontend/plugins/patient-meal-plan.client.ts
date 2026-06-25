/** Carrega o plano alimentar do paciente ao entrar no app autenticado. */

const PUBLIC_PATHS = ['/', '/register', '/documento', '/esqueci-senha', '/redefinir-senha']

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  const route = useRoute()
  const { getToken, bootstrapToken, ensureSession } = usePatientAuth()
  const { fetchPlan, resetPlan } = usePatientMealPlan()

  async function ensurePlanLoaded() {
    bootstrapToken()
    if (!getToken()) {
      resetPlan()
      return
    }
    if (PUBLIC_PATHS.includes(route.path)) return

    const sessionValid = await ensureSession()
    if (!sessionValid) return

    await fetchPlan()
  }

  if (import.meta.client) {
    ensurePlanLoaded()
    watch(() => route.path, ensurePlanLoaded)
  }
})
