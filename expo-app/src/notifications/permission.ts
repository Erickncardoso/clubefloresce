import * as Device from 'expo-device';
import { Linking, Platform } from 'react-native';
import { FACTORY_MESSAGES } from '@/notifications/factory-rules';

type NotificationsModule = typeof import('expo-notifications');

function getNotifications(): NotificationsModule | null {
  try {
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export function isPhysicalDevice() {
  return Device.isDevice;
}

export async function configureNotificationChannels() {
  if (Platform.OS !== 'android') return;
  const Notifications = getNotifications();
  if (!Notifications) return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Lembretes',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#8B967C',
  });
  await Notifications.setNotificationChannelAsync('motivation', {
    name: 'Motivação',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#8B967C',
  });
}

export async function getPermissionState(): Promise<PermissionState> {
  const Notifications = getNotifications();
  if (!Notifications) return 'undetermined';
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }
  if (settings.status === 'denied') return 'denied';
  return 'undetermined';
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (!isPhysicalDevice()) {
    return getPermissionState();
  }
  await configureNotificationChannels();
  const Notifications = getNotifications();
  if (!Notifications) return 'undetermined';
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  if (result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }
  if (result.status === 'denied') return 'denied';
  return 'undetermined';
}

export async function openSystemNotificationSettings() {
  const Notifications = getNotifications();
  const opener = (Notifications as { openSettingsAsync?: () => Promise<void> } | null)?.openSettingsAsync;
  if (typeof opener === 'function') {
    try {
      await opener();
      return;
    } catch {
      /* cai no fallback */
    }
  }

  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
        { key: 'android.provider.extra.APP_PACKAGE', value: 'com.clubeflorescer.app' },
      ]);
      return;
    } catch {
      /* cai no fallback */
    }
  }

  await Linking.openSettings();
}

export function permissionBlockedMessage(state: PermissionState) {
  if (state === 'denied') {
    return 'Permissão bloqueada. Abra as configurações do celular e ative notificações para o Clube Florescer.';
  }
  if (!isPhysicalDevice()) {
    return 'Notificações locais precisam ser testadas em um celular físico (build preview).';
  }
  return 'Ative as notificações para receber lembretes no horário certo.';
}

export const defaultNotificationHandler = () => {
  const Notifications = getNotifications();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};

export function factoryChannelId(key: Exclude<keyof typeof FACTORY_MESSAGES, 'userReminderDefaultBody'>) {
  return FACTORY_MESSAGES[key].channelId;
}
