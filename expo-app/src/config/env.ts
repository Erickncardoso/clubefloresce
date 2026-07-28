import Constants from 'expo-constants';
import { PROD_API_BASE } from './api-env';
import { resolveApiBase } from './resolve-api-base';

export { PROD_API_BASE } from './api-env';

export function getApiBase(): string {
  return resolveApiBase();
}

export const NATIVE_CLIENT_HEADER = 'expo';

export function getAppVersion(): string {
  return Constants.expoConfig?.version || '1.0.0';
}

/** true quando o app aponta para apiclube (build ou dev:expo:prod). */
export function isProdApiBase(): boolean {
  return getApiBase().includes('apiclube.');
}

/** Library ID do Bunny Stream — necessário para embed no app (CDN bloqueia HLS direto). */
export function getBunnyStreamLibraryId(): string {
  const fromExtra = Constants.expoConfig?.extra?.bunnyStreamLibraryId;
  const fromEnv = process.env.EXPO_PUBLIC_BUNNY_STREAM_LIBRARY_ID?.trim();
  return String(fromEnv || fromExtra || '683348').trim();
}
