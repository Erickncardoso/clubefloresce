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
  return (PATIENT_PUBLIC_PATHS as readonly string[]).includes(normalized);
}

export function requiresPatientPaidAccess(path?: string | null): boolean {
  const normalized = String(path || '').split('?')[0];
  if (isPatientPublicPath(normalized)) return false;
  if (isPatientCheckoutPath(normalized)) return false;
  return true;
}
