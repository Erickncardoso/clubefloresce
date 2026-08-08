/**
 * Haptic feedback no app paciente.
 * iOS Safari/PWA não suporta navigator.vibrate — retorna false sem erro.
 */

export function canPatientHaptic() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

/** @param {number | number[]} pattern */
export function patientHaptic(pattern = 12) {
  if (!canPatientHaptic()) return false
  try {
    return navigator.vibrate(pattern)
  } catch {
    return false
  }
}

/** Pulso único ao tocar no + */
export function patientHapticTap(strength = 14) {
  return patientHaptic(strength)
}

/** Sequência ao abrir o menu rápido — um único padrão (funciona melhor que vários setTimeout). */
export function patientHapticQuickDialOpen(itemCount = 8, staggerMs = 58) {
  if (!canPatientHaptic()) return false

  const pattern = [12, 60]
  for (let i = 1; i < itemCount; i += 1) {
    pattern.push(12, staggerMs)
  }

  return patientHaptic(pattern)
}
