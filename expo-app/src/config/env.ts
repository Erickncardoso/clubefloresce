import Constants from 'expo-constants';
import { PROD_API_BASE } from './api-env';

export { PROD_API_BASE } from './api-env';

export function getApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE?.trim();
  const fromExtra = Constants.expoConfig?.extra?.apiBase;
  const candidate =
    fromEnv
    || (typeof fromExtra === 'string' ? fromExtra : '')
    || PROD_API_BASE;

  return candidate.replace(/\/$/, '');
}

export const NATIVE_CLIENT_HEADER = 'expo';

export function getAppVersion(): string {
  return Constants.expoConfig?.version || '1.0.0';
}
