import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import { PROD_API_BASE } from './api-env';

const DEFAULT_BACKEND_PORT = '3001';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

function isProdApiBase(value: string): boolean {
  return /apiclube\.|nutrisabellajardim\.com\.br\/api/i.test(value);
}

function isLoopbackHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}

function hostFromUri(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const value = raw.trim();
  try {
    const withScheme = /^[a-z]+:\/\//i.test(value) ? value : `http://${value}`;
    const hostname = new URL(withScheme).hostname;
    return hostname || null;
  } catch {
    const host = value.split(':')[0]?.trim();
    return host || null;
  }
}

/** IP/hostname do Metro — no celular físico isso é o IP do Mac na LAN. */
function getMetroHost(): string | null {
  const scriptURL = (NativeModules.SourceCode as { scriptURL?: string } | undefined)?.scriptURL;
  const candidates = [
    scriptURL,
    Constants.expoGoConfig?.debuggerHost,
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri,
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost,
    (Constants as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } }).manifest2
      ?.extra?.expoGo?.debuggerHost,
  ];

  for (const raw of candidates) {
    const host = hostFromUri(raw);
    if (host) return host;
  }

  return null;
}

function buildLocalApiBase(host: string, port = DEFAULT_BACKEND_PORT): string {
  return trimTrailingSlash(`http://${host}:${port}/api`);
}

/** Backend local em dev — simulador no Mac, emulador, ou celular na mesma rede. */
export function resolveDevApiBase(): string {
  const explicit = process.env.EXPO_PUBLIC_API_BASE?.trim();
  if (explicit && explicit !== 'auto' && !isProdApiBase(explicit)) {
    return trimTrailingSlash(explicit);
  }

  const port = process.env.EXPO_PUBLIC_API_PORT?.trim() || DEFAULT_BACKEND_PORT;

  if (Platform.OS === 'android' && !Constants.isDevice) {
    return buildLocalApiBase('10.0.2.2', port);
  }

  const metroHost = getMetroHost();

  // Celular de verdade: nunca 127.0.0.1 (isso é o próprio aparelho).
  if (Constants.isDevice) {
    if (metroHost && !isLoopbackHost(metroHost)) {
      return buildLocalApiBase(metroHost, port);
    }
    return buildLocalApiBase('127.0.0.1', port);
  }

  if (metroHost && !isLoopbackHost(metroHost)) {
    return buildLocalApiBase(metroHost, port);
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
