import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserReminder } from '@/notifications/types';

const STORAGE_KEY = 'cf-user-reminders-v1';

function normalizeReminder(value: unknown): UserReminder | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const label = String(item.label || '').trim();
  if (!label) return null;
  const hour = Number(item.hour ?? 8);
  const minute = Number(item.minute ?? 0);
  const weekdays = Array.isArray(item.weekdays)
    ? item.weekdays.map((d) => Number(d)).filter((d) => d >= 1 && d <= 7)
    : [2, 3, 4, 5, 6];
  return {
    id: String(item.id || `reminder-${Date.now()}`),
    label,
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 8,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
    weekdays: weekdays.length ? weekdays : [2, 3, 4, 5, 6],
    route: String(item.route || '/dieta'),
    enabled: item.enabled !== false,
  };
}

export async function loadUserReminders(): Promise<UserReminder[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeReminder(item))
      .filter((item): item is UserReminder => Boolean(item));
  } catch {
    return [];
  }
}

export async function saveUserReminders(reminders: UserReminder[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

export function createUserReminder(partial: Pick<UserReminder, 'label' | 'hour' | 'minute'> & Partial<UserReminder>): UserReminder {
  return {
    id: partial.id || `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: partial.label.trim(),
    hour: partial.hour,
    minute: partial.minute,
    weekdays: partial.weekdays?.length ? partial.weekdays : [2, 3, 4, 5, 6],
    route: partial.route || '/dieta',
    enabled: partial.enabled !== false,
  };
}
