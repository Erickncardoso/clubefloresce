import { router } from 'expo-router';
import { extractNotificationRoute } from '@/lib/video-call';
import type { NotificationPayload } from '@/notifications/types';

export { isVideoCallNotificationData } from '@/lib/video-call';

export function handleNotificationResponse(data: unknown) {
  if (!data || typeof data !== 'object') return;
  const payload = data as Partial<NotificationPayload> & Record<string, unknown>;
  const route = extractNotificationRoute(payload);
  if (!route) return;
  router.push(route as never);
}
