import { isPatientCheckoutPath } from './patient-access';

/** Rotas públicas — espelha `frontend/utils/patient-route-guard.ts`. */

export const PATIENT_PUBLIC_PATHS = [
  '/',
  '/register',
  '/documento',
  '/esqueci-senha',
  '/redefinir-senha',
  '/abrir',
] as const;

export function isPatientPublicPath(path?: string | null): boolean {
  const normalized = String(path || '').split('?')[0];
  if ((PATIENT_PUBLIC_PATHS as readonly string[]).includes(normalized)) return true;
  // Política/termos acessíveis no cadastro e sem login (exigência App Store).
  if (normalized === '/legal' || normalized.startsWith('/legal/')) return true;
  return false;
}

export function requiresPatientPaidAccess(path?: string | null): boolean {
  const normalized = String(path || '').split('?')[0];
  if (isPatientPublicPath(normalized)) return false;
  if (isPatientCheckoutPath(normalized)) return false;
  return true;
}
