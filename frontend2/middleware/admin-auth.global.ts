/** Painel admin — exige login de nutricionista validado no backend. */
import {
  getVerifiedUser,
  readFreshLogin,
  verifyAuthSession,
} from '~/composables/useAuthSession.js'

export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig()
  if (config.public.mobileApp) return

  const publicPaths = ['/', '/setup/nutricionista', '/esqueci-senha', '/redefinir-senha']
  if (publicPaths.includes(to.path)) return
  if (import.meta.server) return

  const fresh = readFreshLogin()
  if (fresh?.role === 'NUTRICIONISTA') return

  const cached = getVerifiedUser()
  if (cached?.role === 'NUTRICIONISTA') return

  const user = await verifyAuthSession({ requiredRole: 'NUTRICIONISTA' })
  if (!user) return navigateTo('/')
})
