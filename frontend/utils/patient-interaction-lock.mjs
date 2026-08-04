import { resetPatientScrollLock } from '~/composables/useVerticalWheelPassthrough'

/** Destrava toques/cliques presos após menu (+), drawer ou overlay no PWA iOS. */
export function releasePatientInteractionLock() {
  if (typeof document === 'undefined') return

  document.documentElement.classList.remove('patient-quick-dial-open')
  resetPatientScrollLock()
}
