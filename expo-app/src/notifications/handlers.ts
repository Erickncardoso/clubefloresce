import { router } from 'expo-router';
import type { NotificationPayload } from '@/notifications/types';

export function handleNotificationResponse(data: unknown) {
  if (!data || typeof data !== 'object') return;
  const payload = data as Partial<NotificationPayload>;
  const route = String(payload.route || '').trim();
  if (!route) return;
  router.push(route as never);
}
