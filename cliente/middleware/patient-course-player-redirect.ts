import { resolvePatientCoursePlayerUrl } from '~/utils/open-patient-course'

/** Pacientes no PWA vão direto ao player — não à página de catálogo /cursos/:id. */
export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  const courseId = String(to.params.id || '').trim()
  if (!to.path.startsWith('/cursos/') || !courseId || courseId === 'index') return

  if (import.meta.server) return

  const role = localStorage.getItem('user_role')
  if (role === 'NUTRICIONISTA') return

  const apiBase = config.public.apiBase
  const token = localStorage.getItem('auth_token')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  try {
    const course = await $fetch(`${apiBase}/courses/${courseId}`, { headers })
    const playerUrl = resolvePatientCoursePlayerUrl(course)
    if (playerUrl) {
      return navigateTo(playerUrl, { replace: true })
    }
  } catch {
    /* cai no fallback */
  }

  return navigateTo('/cursos', { replace: true })
})
