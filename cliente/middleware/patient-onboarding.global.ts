import { isPatientAccessBlockedError, isPatientCheckoutPath } from '~/utils/patient-access'
import {
  isPatientPublicPath,
  resolvePatientRouteAccess,
} from '~/utils/patient-route-guard'

/** Redireciona pacientes sem onboarding completo para /onboarding. */
export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return
  if (isPatientPublicPath(to.path)) return
  if (isPatientCheckoutPath(to.path)) return
  if (import.meta.server) return

  const patientAuth = usePatientAuth()
  const sessionValid = await patientAuth.ensurePatientSession()
  if (!sessionValid) return

  const accessRedirect = await resolvePatientRouteAccess(to.path)
  if (accessRedirect) {
    return navigateTo(accessRedirect, { replace: true })
  }

  const { fetchStatus, isComplete, loaded } = usePatientOnboarding()

  try {
    await fetchStatus({ force: !loaded.value })
  } catch (err) {
    if (isPatientAccessBlockedError(err)) {
      return navigateTo('/assinatura', { replace: true })
    }
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
