import {
  isPatientPublicPath,
  resolvePatientRouteAccess,
} from '~/utils/patient-route-guard'

/** Exige login de paciente e acesso pago/liberado nas rotas do app (PWA). */
export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return
  if (isPatientPublicPath(to.path)) return
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
