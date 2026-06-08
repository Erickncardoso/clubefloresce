/** Rotas exclusivas do app do paciente — redireciona para web se não estiver no modo paciente. */
export default defineNuxtRouteMiddleware(() => {
  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return navigateTo('/cursos')
})
