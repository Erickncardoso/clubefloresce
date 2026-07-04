import Constants from 'expo-constants';

const DEFAULT_DEV_API = 'http://127.0.0.1:3001/api';
const PROD_API = 'https://apiclube.nutrisabellajardim.com.br/api';

export function getApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (__DEV__) return DEFAULT_DEV_API;
  return PROD_API;
}

export const NATIVE_CLIENT_HEADER = 'expo';

export function getAppVersion(): string {
  return Constants.expoConfig?.version || '1.0.0';
}
