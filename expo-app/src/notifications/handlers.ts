import { router } from 'expo-router';
import { extractNotificationRoute } from '@/lib/video-call';

export { isVideoCallNotificationData } from '@/lib/video-call';

const BUTTON_ROUTES: Record<string, string> = {
  'admin-checkin': '/check-in',
  'admin-bella': '/bella',
  'admin-diary': '/diario',
  'meal-reminder-open': '',
  'meal-reminder-items': '',
};

type NotificationResponseLike = {
  actionIdentifier?: string;
  notification?: { request?: { content?: { data?: unknown } } };
};

export function handleNotificationResponse(input: unknown) {
  const response = (input || {}) as NotificationResponseLike;
  const data = response.notification?.request?.content?.data;
  const payload =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : {};

  const action = String(response.actionIdentifier || '');
  const preset = BUTTON_ROUTES[action];
  const route = preset && preset.length > 0 ? preset : extractNotificationRoute(payload);
  if (!route) return;
  router.push(route as never);
}
