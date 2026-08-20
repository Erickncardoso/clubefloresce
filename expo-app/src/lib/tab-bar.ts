import { isPatientCheckoutPath } from '@/lib/patient-access';
import { isPatientPublicPath } from '@/lib/patient-routes';

/** Margem lateral da cápsula flutuante (tab bar e composers). */
export const PATIENT_NAV_PILL_MARGIN_X = 16;
/** Altura da cápsula flutuante (ícone + rótulo). */
export const PATIENT_NAV_HEIGHT = 58;
/** Margem da cápsula acima do home indicator (efeito flutuante). */
export const PATIENT_NAV_FLOAT_MARGIN = 0;
/** Folga entre conteúdo e tab bar flutuante. */
export const PATIENT_NAV_CONTENT_GAP = 14;

/** Clearance total (tab + margem flutuante + folga + safe area inferior). */
export function getPatientTabClearance(bottomInset = 0, withTab = true) {
  if (!withTab) return Math.max(bottomInset, 0);
  return (
    PATIENT_NAV_HEIGHT
    + PATIENT_NAV_FLOAT_MARGIN
    + PATIENT_NAV_CONTENT_GAP
    + Math.max(bottomInset, 0)
  );
}

const HIDE_TAB_BAR_PATHS = new Set([
  '/',
  '/register',
  '/documento',
  '/onboarding',
  '/esqueci-senha',
  '/redefinir-senha',
  '/abrir',
  '/chamada',
]);

/** Espelha `cliente/app.vue` — quando mostrar a tab bar. */
export function shouldShowPatientTabBar(pathname: string): boolean {
  const path = pathname.split('?')[0];
  if (HIDE_TAB_BAR_PATHS.has(path)) return false;
  if (path.startsWith('/legal/')) return false;
  if (isPatientCheckoutPath(path)) return false;
  if (path.startsWith('/modulos/')) return false;
  if (path.startsWith('/bella/chat')) return false;
  if (path.startsWith('/chamada')) return false;
  return true;
}

export function shouldUsePatientShell(pathname: string): boolean {
  const path = pathname.split('?')[0];
  if (isPatientPublicPath(path) && path !== '/documento') return false;
  if (path.startsWith('/onboarding')) return false;
  if (path.startsWith('/modulos/')) return false;
  if (path.startsWith('/bella/chat')) return false;
  if (path.startsWith('/chamada')) return false;
  return true;
}
