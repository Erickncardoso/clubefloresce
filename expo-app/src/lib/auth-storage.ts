import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'cf_expo_auth_token';
const USER_ID_KEY = 'cf_expo_user_id';

// expo-secure-store não roda no navegador (Expo Web); localStorage cobre esse caso.
const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getStoredToken(): Promise<string | null> {
  try {
    return await getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveStoredToken(token: string): Promise<void> {
  await setItem(TOKEN_KEY, token);
}

export async function clearStoredSession(): Promise<void> {
  await deleteItem(TOKEN_KEY);
  await deleteItem(USER_ID_KEY);
}

export async function saveStoredUserId(userId: string): Promise<void> {
  await setItem(USER_ID_KEY, userId);
}

export async function getStoredUserId(): Promise<string | null> {
  try {
    return await getItem(USER_ID_KEY);
  } catch {
    return null;
  }
}
