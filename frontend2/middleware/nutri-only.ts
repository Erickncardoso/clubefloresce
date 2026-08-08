/** Rotas exclusivas da nutricionista no painel admin. */
import { verifyAuthSession } from '~/composables/useAuthSession.js'

export default defineNuxtRouteMiddleware(async () => {
  const config = useRuntimeConfig()
  if (config.public.mobileApp) return
  if (import.meta.server) return

  const user = await verifyAuthSession({ requiredRole: 'NUTRICIONISTA' })
  if (!user) return navigateTo('/')
})
