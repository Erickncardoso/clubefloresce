/** URL pública do app paciente (checkout, WhatsApp, e-mail). */
export const PATIENT_APP_PRODUCTION_URL = 'https://app.nutrisabellajardim.com.br'

/**
 * Página de planos/assinatura em produção.
 * Link direto (sem /abrir) — no PWA o usuário cai na tela de planos.
 */
export function getPatientCheckoutUrl(source = 'premium-gate') {
  const params = new URLSearchParams({
    source: String(source || 'premium-gate'),
  })
  return `${PATIENT_APP_PRODUCTION_URL}/assinatura?${params.toString()}`
}
