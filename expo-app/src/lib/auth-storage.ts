import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'cf_expo_auth_token';
const USER_ID_KEY = 'cf_expo_user_id';

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_ID_KEY);
}

export async function saveStoredUserId(userId: string): Promise<void> {
  await SecureStore.setItemAsync(USER_ID_KEY, userId);
}

export async function getStoredUserId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(USER_ID_KEY);
  } catch {
    return null;
  }
}
