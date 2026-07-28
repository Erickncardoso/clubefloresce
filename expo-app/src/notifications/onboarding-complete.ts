import {
  configureNotificationChannels,
  getPermissionState,
  requestNotificationPermission,
  type PermissionState,
} from '@/notifications/permission';
import { sendLocalTestNotification } from '@/notifications/test-notification';
import { syncLocalNotifications } from '@/notifications/sync-engine';

type ActivateContext = {
  request: <T>(path: string, init?: RequestInit & { method?: string }) => Promise<T>;
  checkinPreferenceEnabled: boolean;
};

export async function sendOnboardingCompleteTestNotification(
  options: { immediate?: boolean } = {},
): Promise<boolean> {
  return sendLocalTestNotification({
    immediate: options.immediate ?? false,
    logicalKey: 'factory:onboarding-complete',
  });
}

export async function activateOnboardingPushNotifications(
  ctx: ActivateContext,
): Promise<PermissionState> {
  const state = await requestNotificationPermission();
  if (state === 'granted') {
    await sendOnboardingCompleteTestNotification({ immediate: false });
    await syncLocalNotifications({
      request: ctx.request,
      onboardingComplete: true,
      checkinPreferenceEnabled: ctx.checkinPreferenceEnabled,
    });
  }
  return state;
}

export async function finalizeOnboardingNotifications(
  ctx: ActivateContext,
): Promise<boolean> {
  const permission = await getPermissionState();
  if (permission !== 'granted') return false;

  await configureNotificationChannels();
  const sent = await sendOnboardingCompleteTestNotification({ immediate: true });
  await syncLocalNotifications({
    request: ctx.request,
    onboardingComplete: true,
    checkinPreferenceEnabled: ctx.checkinPreferenceEnabled,
  });
  return sent;
}
