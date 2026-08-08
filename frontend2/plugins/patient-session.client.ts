/** Mantém a sessão do app paciente ativa entre aberturas do PWA. */
import {
  isPatientCheckoutPath,
  shouldKeepPatientSessionOnError,
} from '~/utils/patient-access'

const PUBLIC_PATHS = ['/', '/register', '/documento', '/esqueci-senha', '/redefinir-senha', '/abrir']

export default defineNuxtPlugin({
  name: 'patient-session',
  enforce: 'post',
  setup() {
    const config = useRuntimeConfig()
    if (!config.public.mobileApp) return

    const {
      bootstrapToken,
      refreshSession,
      isSessionExpiredError,
      isPatientAccessRevokedError,
      isTransientAuthError,
      clearSession,
      assertPatientRole,
    } = usePatientAuth()
    const { readFreshLogin } = useAuthSession()
    const router = useRouter()

    bootstrapToken()

    const initialPath = router.currentRoute.value.path
    const isPasswordRecoveryPath = initialPath === '/redefinir-senha' || initialPath === '/esqueci-senha'

    const redirectForAccessChange = () => {
      const path = router.currentRoute.value.path
      if (PUBLIC_PATHS.includes(path)) return
      if (isPatientCheckoutPath(path)) return
      // Continua logada — só leva à renovação/assinatura.
      void navigateTo('/assinatura')
    }

    const redirectToLogin = () => {
      const path = router.currentRoute.value.path
      if (PUBLIC_PATHS.includes(path)) return
      if (isPatientCheckoutPath(path)) return
      void navigateTo('/')
    }

    const handleAuthFailure = (err: unknown) => {
      if (readFreshLogin()) return
      if (isTransientAuthError(err)) return

      // Upgrade / downgrade / expiração / premium: NUNCA desloga.
      if (shouldKeepPatientSessionOnError(err)) {
        if (isPatientAccessRevokedError(err)) {
          redirectForAccessChange()
        }
        return
      }

      const status = (err as { statusCode?: number; status?: number })?.statusCode
        ?? (err as { status?: number })?.status

      // 403 residual = autorização (plano/role), não autenticação.
      if (status === 403) return

      if (!isSessionExpiredError(err)) return

      clearSession()
      redirectToLogin()
    }

    /** Renova cookie em background — nunca desloga só porque o refresh falhou. */
    const renew = () => {
      if (!bootstrapToken()) return
      if (readFreshLogin() && assertPatientRole()) return

      void refreshSession().catch(handleAuthFailure)
    }

    if (!isPasswordRecoveryPath) {
      renew()

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') renew()
        })
      }
    }

    // Link de e-mail (redefinir senha) não deve herdar $fetch com cookie/sessão
    if (isPasswordRecoveryPath) return

    const guardedFetch = $fetch.create({
      credentials: 'include',
      onRequest({ options }) {
        const { authHeaders: buildAuthHeaders } = usePatientAuth()
        const headers = new Headers(options.headers as HeadersInit)
        Object.entries(buildAuthHeaders()).forEach(([key, value]) => {
          if (!headers.has(key)) headers.set(key, value)
        })
        options.headers = headers
      },
      onResponseError({ response }) {
        const path = router.currentRoute.value.path
        if (isPatientCheckoutPath(path)) return

        handleAuthFailure({
          statusCode: response.status,
          data: response._data,
        })
      },
    })

    globalThis.$fetch = guardedFetch
  },
})
