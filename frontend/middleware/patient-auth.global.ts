/** Exige login nas rotas do app do paciente (preview web antes do Capacitor). */
export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  const publicPaths = ['/', '/register', '/onboarding']
  if (publicPaths.includes(to.path)) return

  if (import.meta.server) return

  const token = localStorage.getItem('auth_token')
  if (!token) return navigateTo('/')
})
