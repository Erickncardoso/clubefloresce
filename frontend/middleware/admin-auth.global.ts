/** Painel admin — exige login de nutricionista em todas as rotas exceto login e setup inicial. */
export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig()
  if (config.public.mobileApp) return

  const publicPaths = ['/', '/setup/nutricionista']
  if (publicPaths.includes(to.path)) return
  if (import.meta.server) return

  const token = localStorage.getItem('auth_token')
  const role = localStorage.getItem('user_role')

  if (!token) return navigateTo('/')
  if (role !== 'NUTRICIONISTA') return navigateTo('/')
})
