import {
  isPatientCheckoutPath,
  isPatientLimitedAccessActive,
  isPatientLimitedAppPath,
  isPatientSelfServicePath,
  PATIENT_PREMIUM_REQUIRED_MESSAGE,
} from '~/utils/patient-access'
import { isPatientPublicPath } from '~/utils/patient-route-guard'

const PREMIUM_GATE_STATE_KEY = 'patient-premium-gate'

function normalizePath(to) {
  if (!to) return ''
  if (typeof to === 'string') return to.split('?')[0] || ''
  if (typeof to === 'object' && to.path) return String(to.path).split('?')[0] || ''
  return ''
}

export function featureLabelForPath(path = '') {
  const normalized = normalizePath(path)
  if (normalized.startsWith('/dieta') || normalized.startsWith('/substituicao')) return 'plano alimentar'
  if (normalized.startsWith('/evolucao')) return 'evolução e metas'
  if (normalized.startsWith('/bella')) return 'Bella IA'
  if (normalized.startsWith('/comunidade')) return 'comunidade'
  if (
    normalized.startsWith('/conteudo')
    || normalized.startsWith('/cursos')
    || normalized.startsWith('/ebooks')
    || normalized.startsWith('/modulos')
  ) {
    return 'biblioteca de conteúdos'
  }
  if (normalized.startsWith('/check-in')) return 'check-in semanal'
  if (normalized.startsWith('/chamada')) return 'videochamada'
  return 'este recurso'
}

export function usePatientPremiumGate() {
  const gate = useState(PREMIUM_GATE_STATE_KEY, () => ({
    open: false,
    path: '',
  }))
  const { verifiedUser } = useAuthSession()

  const open = computed(() => Boolean(gate.value?.open))
  const blockedPath = computed(() => String(gate.value?.path || ''))
  const featureLabel = computed(() => featureLabelForPath(blockedPath.value))
  const message = computed(() => PATIENT_PREMIUM_REQUIRED_MESSAGE)

  function isLimitedUser() {
    const user = verifiedUser.value
    if (!user) return false
    return isPatientLimitedAccessActive(
      user.plan,
      user.accessExpiresAt,
      user.approvalEmailSentAt,
    )
  }

  function isBlockedPath(to) {
    const path = normalizePath(to)
    if (!path) return false
    if (!isLimitedUser()) return false
    if (isPatientPublicPath(path)) return false
    if (isPatientCheckoutPath(path)) return false
    if (isPatientSelfServicePath(path)) return false
    if (isPatientLimitedAppPath(path)) return false
    return true
  }

  function openGate(to = '') {
    gate.value = {
      open: true,
      path: normalizePath(to),
    }
  }

  function closeGate() {
    gate.value = {
      open: false,
      path: '',
    }
  }

  /** Navega se o plano permitir; senão abre o modal Free. */
  async function navigateOrGate(to, navigateOptions = {}) {
    if (isBlockedPath(to)) {
      openGate(to)
      return false
    }
    await navigateTo(to, navigateOptions)
    return true
  }

  return {
    gate,
    open,
    blockedPath,
    featureLabel,
    message,
    isLimitedUser,
    isBlockedPath,
    openGate,
    closeGate,
    navigateOrGate,
  }
}
