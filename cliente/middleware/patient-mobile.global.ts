/** Na versão app do paciente, bloqueia rotas exclusivas da nutricionista. */
export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  const blockedPrefixes = [
    '/whatsapp',
    '/usuarios',
    '/financeiro',
    '/ebooks',
    '/personalizar',
    '/gerenciar-cursos',
    '/setup',
    '/dashboard',
  ]

  if (blockedPrefixes.some((prefix) => to.path.startsWith(prefix))) {
    return navigateTo('/inicio')
  }

  const noPatientLayoutPaths = ['/', '/register']
  if (!noPatientLayoutPaths.includes(to.path)) {
    setPageLayout('patient')
  }
})
