import { isPatientCheckoutPath } from '@/lib/patient-access';
import { isPatientPublicPath } from '@/lib/patient-routes';

const HIDE_TAB_BAR_PATHS = new Set([
  '/',
  '/register',
  '/documento',
  '/onboarding',
  '/esqueci-senha',
  '/redefinir-senha',
  '/abrir',
]);

/** Espelha `cliente/app.vue` — quando mostrar a tab bar. */
export function shouldShowPatientTabBar(pathname: string): boolean {
  const path = pathname.split('?')[0];
  if (HIDE_TAB_BAR_PATHS.has(path)) return false;
  if (isPatientCheckoutPath(path)) return false;
  if (path.startsWith('/modulos/')) return false;
  if (path.startsWith('/bella/chat')) return false;
  return true;
}

export function shouldUsePatientShell(pathname: string): boolean {
  const path = pathname.split('?')[0];
  if (isPatientPublicPath(path) && path !== '/documento') return false;
  if (path.startsWith('/onboarding')) return false;
  if (path.startsWith('/modulos/')) return false;
  if (path.startsWith('/bella/chat')) return false;
  return true;
}
