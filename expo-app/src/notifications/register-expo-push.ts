import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { getPermissionState } from '@/notifications/permission';

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

function getNotifications() {
  try {
    return require('expo-notifications') as typeof import('expo-notifications');
  } catch {
    return null;
  }
}

function projectId() {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return Constants.easConfig?.projectId || extra?.eas?.projectId || '';
}

export async function registerExpoPushToken(request: RequestFn) {
  if (!Device.isDevice) return false;
  const permission = await getPermissionState();
  if (permission !== 'granted') return false;

  const Notifications = getNotifications();
  if (!Notifications) return false;

  const id = projectId();
  if (!id) return false;

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId: id });
    const value = token?.data?.trim();
    if (!value) return false;
    await request('/push/expo-token', {
      method: 'POST',
      body: JSON.stringify({ token: value }),
    });
    return true;
  } catch {
    return false;
  }
}
