import { fetchFreshPatientUser } from '~/utils/patient-route-guard'
import {
  didGainFullAccess,
  normalizePatientPath,
  patientAccessFingerprint,
  registerPatientAccessBlockedListener,
  resolvePatientAccessRedirect,
} from '~/utils/patient-access-sync'
import { usePatientPremiumGate } from '~/composables/usePatientPremiumGate'

const POLL_MS = 8_000

/** Sincroniza plano/acesso com o painel da nutri enquanto o PWA está aberto. */
export function usePatientAccessSync() {
  if (!import.meta.client) return

  const route = useRoute()
  const { closeGate } = usePatientPremiumGate()
  const fingerprintRef = ref('')
  const redirectingRef = ref(false)

  async function syncAccess(force = false) {
    if (redirectingRef.value) return

    try {
      const user = await fetchFreshPatientUser()
      if (!user?.id) return

      const nextFingerprint = patientAccessFingerprint(user)
      const prevFingerprint = fingerprintRef.value
      const changed = force || (prevFingerprint && prevFingerprint !== nextFingerprint)

      fingerprintRef.value = nextFingerprint
      if (!changed) return

      const path = normalizePatientPath(route.path)
      const target = resolvePatientAccessRedirect(path, user)

      if (didGainFullAccess(prevFingerprint, nextFingerprint, user)) {
        closeGate()
      }

      if (target && target !== path) {
        redirectingRef.value = true
        await navigateTo(target, { replace: true })
        setTimeout(() => {
          redirectingRef.value = false
        }, 400)
      }
    } catch {
      /* rede — próxima tentativa */
    }
  }

  let poll = null

  onMounted(() => {
    void syncAccess(true)

    registerPatientAccessBlockedListener(() => {
      void syncAccess(true)
    })

    poll = setInterval(() => {
      if (document.visibilityState === 'visible') void syncAccess(false)
    }, POLL_MS)

    document.addEventListener('visibilitychange', onVisible)
  })

  function onVisible() {
    if (document.visibilityState === 'visible') void syncAccess(true)
  }

  onUnmounted(() => {
    registerPatientAccessBlockedListener(null)
    if (poll) clearInterval(poll)
    document.removeEventListener('visibilitychange', onVisible)
  })
}
