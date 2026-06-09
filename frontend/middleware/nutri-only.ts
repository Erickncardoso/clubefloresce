/** Rotas exclusivas da nutricionista no painel web. */
export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig()
  if (config.public.mobileApp) return

  if (import.meta.server) return

  const token = localStorage.getItem('auth_token')
  const role = localStorage.getItem('user_role')

  if (!token || role !== 'NUTRICIONISTA') {
    return navigateTo('/')
  }
})
