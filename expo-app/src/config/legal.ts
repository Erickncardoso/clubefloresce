import Constants from 'expo-constants';

/** URL pública do app paciente (assinatura web, links legais). */
export const PATIENT_WEB_BASE =
  (typeof Constants.expoConfig?.extra?.patientWebUrl === 'string'
    && Constants.expoConfig.extra.patientWebUrl)
  || 'https://app.nutrisabellajardim.com.br';

export const LEGAL_CONTACT_EMAIL = 'contato@nutrisabellajardim.com.br';

/** URLs para App Store Connect — espelham rotas in-app /legal/* */
export const PRIVACY_POLICY_URL = `${PATIENT_WEB_BASE}/legal/privacidade`;
export const TERMS_OF_USE_URL = `${PATIENT_WEB_BASE}/legal/termos`;
export const SUBSCRIPTION_WEB_URL = `${PATIENT_WEB_BASE}/assinatura`;
