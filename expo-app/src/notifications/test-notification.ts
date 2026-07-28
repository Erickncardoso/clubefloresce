import * as Notifications from 'expo-notifications';

import { FACTORY_MESSAGES, NOTIFICATION_TEST_MODE } from '@/notifications/factory-rules';
import { configureNotificationChannels, getPermissionState } from '@/notifications/permission';

type SendTestOptions = {
  /** Dispara na hora (recomendado ao finalizar onboarding). */
  immediate?: boolean;
  logicalKey?: string;
};

/** Aviso local agendado no aparelho — fase atual não usa push remoto Expo. */
export async function sendLocalTestNotification(options: SendTestOptions = {}): Promise<boolean> {
  const permission = await getPermissionState();
  if (permission !== 'granted') return false;

  await configureNotificationChannels();

  const msg = FACTORY_MESSAGES.onboardingComplete;
  const immediate = options.immediate ?? true;
  const delaySeconds = NOTIFICATION_TEST_MODE ? 1 : immediate ? 0 : 3;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body: msg.body,
      data: {
        route: msg.route,
        logicalKey: options.logicalKey || 'factory:onboarding-complete',
      },
      sound: true,
      ...(msg.channelId ? { channelId: msg.channelId } : {}),
    },
    trigger: immediate
      ? null
      : {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delaySeconds || 1,
        },
  });

  return true;
}
