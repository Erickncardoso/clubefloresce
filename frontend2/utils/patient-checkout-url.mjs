/** URL pública do app paciente (checkout, WhatsApp, e-mail). */
export const PATIENT_APP_PRODUCTION_URL = 'https://app.nutrisabellajardim.com.br'

/**
 * Página de planos/assinatura em produção.
 * `guest=1` evita herdar cookie de outra conta no Safari/Chrome
 * (ex.: PWA logado com A, navegador ainda com sessão B).
 */
export function getPatientCheckoutUrl(source = 'premium-gate') {
  const params = new URLSearchParams({
    source: String(source || 'premium-gate'),
    guest: '1',
  })
  return `${PATIENT_APP_PRODUCTION_URL}/assinatura?${params.toString()}`
}
