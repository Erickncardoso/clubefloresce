/** URL pública do app paciente (checkout, WhatsApp, e-mail). */
export const PATIENT_APP_PRODUCTION_URL = 'https://app.nutrisabellajardim.com.br'

/**
 * Link de assinatura em produção.
 * Usa /abrir para deep-link estável (e-mail, modal Free, WhatsApp).
 */
export function getPatientCheckoutUrl(source = 'premium-gate') {
  const params = new URLSearchParams({
    source: String(source || 'premium-gate'),
    to: '/assinatura',
  })
  return `${PATIENT_APP_PRODUCTION_URL}/abrir?${params.toString()}`
}
