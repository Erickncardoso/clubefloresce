/** Rotas autenticadas do app paciente — exige sessão válida e acesso ativo. */
import { resolvePatientRouteAccess } from '~/utils/patient-route-guard'

export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return
  if (import.meta.server) return

  const { ensurePatientSession } = usePatientAuth()
  const sessionValid = await ensurePatientSession()

  if (!sessionValid) {
    return navigateTo('/')
  }

  const redirect = await resolvePatientRouteAccess(to.path)
  if (redirect) {
    return navigateTo(redirect, { replace: true })
  }
})
