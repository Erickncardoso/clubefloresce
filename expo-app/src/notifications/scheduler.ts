import * as Notifications from 'expo-notifications';
import { FACTORY_LIMITS } from '@/notifications/factory-rules';
import {
  getDailyScheduledCount,
  incrementDailyScheduledCount,
  loadRegistry,
  removeRegistryKeys,
  saveRegistry,
  upsertRegistryEntry,
} from '@/notifications/registry';
import type { NotificationLogicalKey, NotificationPayload } from '@/notifications/types';

function isInQuietHours(date: Date) {
  const hour = date.getHours();
  const { quietStartHour, quietEndHour } = FACTORY_LIMITS;
  if (quietStartHour > quietEndHour) {
    return hour >= quietStartHour || hour < quietEndHour;
  }
  return hour >= quietStartHour && hour < quietEndHour;
}

function nextAllowedDate(from: Date) {
  const next = new Date(from);
  if (!isInQuietHours(next)) return next;
  next.setDate(next.getDate() + (next.getHours() >= FACTORY_LIMITS.quietStartHour ? 1 : 0));
  next.setHours(FACTORY_LIMITS.quietEndHour, 0, 0, 0);
  return next;
}

async function canScheduleMore(at: Date) {
  const count = await getDailyScheduledCount(at);
  return count < FACTORY_LIMITS.maxPerDay;
}

export async function cancelLogicalKeys(keys: NotificationLogicalKey[]) {
  if (!keys.length) return;
  const ids = (await loadRegistry())
    .filter((entry) => keys.includes(entry.logicalKey))
    .map((entry) => entry.notificationId);
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  );
  await removeRegistryKeys(keys);
}

export async function cancelAllManagedNotifications() {
  const registry = await loadRegistry();
  await Promise.all(
    registry.map((entry) =>
      Notifications.cancelScheduledNotificationAsync(entry.notificationId).catch(() => {}),
    ),
  );
  await saveRegistry([]);
}

type ScheduleInput = {
  logicalKey: NotificationLogicalKey;
  title: string;
  body: string;
  route: string;
  channelId?: 'reminders' | 'motivation';
  trigger: Notifications.NotificationTriggerInput;
};

export async function scheduleManagedNotification(input: ScheduleInput): Promise<string | null> {
  await cancelLogicalKeys([input.logicalKey]);

  let trigger = input.trigger;
  if (trigger && 'date' in trigger && trigger.date) {
    const date = new Date(trigger.date as Date);
    if (isInQuietHours(date)) {
      if (!(await canScheduleMore(nextAllowedDate(date)))) return null;
    } else if (!(await canScheduleMore(date))) {
      return null;
    }
  }

  const payload: NotificationPayload = {
    route: input.route,
    logicalKey: input.logicalKey,
  };

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: payload,
      sound: true,
      ...(input.channelId ? { channelId: input.channelId } : {}),
    },
    trigger,
  });

  const scheduledFor =
    trigger && 'date' in trigger && trigger.date
      ? new Date(trigger.date as Date).toISOString()
      : new Date().toISOString();

  await upsertRegistryEntry({
    logicalKey: input.logicalKey,
    notificationId: id,
    scheduledFor,
  });
  await incrementDailyScheduledCount(new Date(scheduledFor));
  return id;
}

export async function scheduleWeeklyNotification(input: {
  logicalKey: NotificationLogicalKey;
  title: string;
  body: string;
  route: string;
  channelId?: 'reminders' | 'motivation';
  weekday: number;
  hour: number;
  minute: number;
}) {
  return scheduleManagedNotification({
    ...input,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: input.weekday,
      hour: input.hour,
      minute: input.minute,
    },
  });
}

export async function scheduleDailyNotification(input: {
  logicalKey: NotificationLogicalKey;
  title: string;
  body: string;
  route: string;
  channelId?: 'reminders' | 'motivation';
  hour: number;
  minute: number;
}) {
  return scheduleManagedNotification({
    ...input,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: input.hour,
      minute: input.minute,
    },
  });
}

export async function scheduleAtDate(input: {
  logicalKey: NotificationLogicalKey;
  title: string;
  body: string;
  route: string;
  channelId?: 'reminders' | 'motivation';
  date: Date;
}) {
  const when = nextAllowedDate(input.date);
  if (when.getTime() <= Date.now()) return null;
  return scheduleManagedNotification({
    logicalKey: input.logicalKey,
    title: input.title,
    body: input.body,
    route: input.route,
    channelId: input.channelId,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
    },
  });
}

export async function scheduleUserReminder(input: {
  id: string;
  label: string;
  body: string;
  route: string;
  hour: number;
  minute: number;
  weekdays: number[];
}) {
  const prefix = `user:${input.id}` as NotificationLogicalKey;
  const existing = (await loadRegistry())
    .filter((entry) => entry.logicalKey.startsWith(prefix))
    .map((entry) => entry.logicalKey);
  if (existing.length) await cancelLogicalKeys(existing);

  const ids: string[] = [];
  for (const weekday of input.weekdays) {
    const logicalKey = `${prefix}:d${weekday}` as NotificationLogicalKey;
    const id = await scheduleManagedNotification({
      logicalKey,
      title: input.label,
      body: input.body,
      route: input.route,
      channelId: 'reminders',
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: input.hour,
        minute: input.minute,
      },
    });
    if (id) ids.push(id);
  }
  return ids;
}
