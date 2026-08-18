import { PATIENT_WEB_BASE } from '@/config/legal';

/** URL HTTPS dos assets `/jitsi-vb` (nunca HTTP local — WebView exige origem segura para câmera). */
export function resolveVbAssetsBase(): string {
  return PATIENT_WEB_BASE.replace(/\/+$/, '');
}
