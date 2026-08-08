import { resetPatientScrollLock } from '~/composables/useVerticalWheelPassthrough'

/** Destrava toques/cliques presos após menu (+), drawer ou overlay no PWA iOS. */
export function releasePatientInteractionLock() {
  if (typeof document === 'undefined') return

  document.documentElement.classList.remove('patient-quick-dial-open')
  resetPatientScrollLock()
}

/**
 * Se a classe `patient-quick-dial-open` ficou presa sem o menu aberto,
 * o app inteiro fica com clique morto (tab bar + conteúdo). Corrige isso.
 */
export function repairStuckPatientInteractionLock(isDialOpen = false) {
  if (typeof document === 'undefined') return false
  if (isDialOpen) return false
  if (!document.documentElement.classList.contains('patient-quick-dial-open')) return false
  releasePatientInteractionLock()
  return true
}
