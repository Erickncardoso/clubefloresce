import {
  hasAuthSession,
  markAuthSessionHint,
  purgeLegacyRoleStorage,
  verifyAuthSession,
} from '~/composables/useAuthSession.js'

/** Remove role/JWT legados. Revalidação do paciente fica no plugin patient-session. */
export default defineNuxtPlugin({
  name: 'auth-session-bootstrap',
  enforce: 'pre',
  async setup() {
    if (import.meta.server || typeof window === 'undefined') return

    const config = useRuntimeConfig()
    purgeLegacyRoleStorage()

    // Migração cookie httpOnly: JWT legado no header bloqueava cf_session
    if (localStorage.getItem('user_id')) {
      localStorage.removeItem('auth_token')
      markAuthSessionHint()
    }

    if (!hasAuthSession()) return

    // App paciente: não forçar /auth/me aqui — falha de rede apagava a sessão ao reabrir
    if (config.public.mobileApp) return

    await verifyAuthSession({ force: true })
  },
})
