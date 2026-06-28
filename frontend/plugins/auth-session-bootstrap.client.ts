import {
  hasAuthSession,
  purgeLegacyRoleStorage,
  verifyAuthSession,
} from '~/composables/useAuthSession.js'

/** Remove role/JWT legados e revalida sessão com o backend. */
export default defineNuxtPlugin({
  name: 'auth-session-bootstrap',
  enforce: 'pre',
  async setup() {
    if (import.meta.server || typeof window === 'undefined') return

    purgeLegacyRoleStorage()

    // Migração cookie httpOnly: JWT legado no header bloqueava cf_session
    if (localStorage.getItem('user_id')) {
      localStorage.removeItem('auth_token')
    }

    if (!hasAuthSession()) return

    await verifyAuthSession({ force: true })
  },
})
