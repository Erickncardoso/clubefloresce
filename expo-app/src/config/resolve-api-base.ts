import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { PROD_API_BASE } from './api-env';

const DEFAULT_BACKEND_PORT = '3001';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

function isProdApiBase(value: string): boolean {
  return /apiclube\.|nutrisabellajardim\.com\.br\/api/i.test(value);
}

function getDebuggerHost(): string | null {
  const candidates = [
    Constants.expoGoConfig?.debuggerHost,
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri,
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost,
    (Constants as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })
      .manifest2?.extra?.expoGo?.debuggerHost,
  ];

  for (const raw of candidates) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const host = raw.split(':')[0]?.trim();
    if (host) return host;
  }

  return null;
}

function buildLocalApiBase(host: string, port = DEFAULT_BACKEND_PORT): string {
  return trimTrailingSlash(`http://${host}:${port}/api`);
}

/** Backend local em dev — emulador, simulador ou celular na mesma Wi-Fi. */
export function resolveDevApiBase(): string {
  const explicit = process.env.EXPO_PUBLIC_API_BASE?.trim();
  if (explicit && explicit !== 'auto' && !isProdApiBase(explicit)) {
    return trimTrailingSlash(explicit);
  }

  const port = process.env.EXPO_PUBLIC_API_PORT?.trim() || DEFAULT_BACKEND_PORT;

  if (Platform.OS === 'android' && !Constants.isDevice) {
    return buildLocalApiBase('10.0.2.2', port);
  }

  const debuggerHost = getDebuggerHost();
  if (debuggerHost) {
    if (debuggerHost === 'localhost' || debuggerHost === '127.0.0.1') {
      return buildLocalApiBase('127.0.0.1', port);
    }
    return buildLocalApiBase(debuggerHost, port);
  }

  return buildLocalApiBase('127.0.0.1', port);
}

export function resolveApiBase(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiBase;
  const explicit =
    process.env.EXPO_PUBLIC_API_BASE?.trim()
    || (typeof fromExtra === 'string' ? fromExtra : '');

  if (!__DEV__) {
    return trimTrailingSlash(explicit || PROD_API_BASE);
  }

  if (explicit && isProdApiBase(explicit)) {
    return trimTrailingSlash(explicit);
  }

  if (!explicit || explicit === 'auto') {
    return resolveDevApiBase();
  }

  return trimTrailingSlash(explicit);
}
