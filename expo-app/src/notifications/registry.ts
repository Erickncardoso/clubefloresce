import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationLogicalKey, ScheduledRegistryEntry } from '@/notifications/types';

const REGISTRY_KEY = 'cf-notification-registry-v1';
const DAILY_COUNT_KEY = 'cf-notification-daily-count-v1';
const LAST_OPEN_KEY = 'cf-last-app-open-at';
const ONBOARDING_LEFT_KEY = 'cf-onboarding-left-at';
const CHECKIN_DRAFT_KEY = 'cf-checkin-draft-at';
const STREAK7_KEY = 'cf-streak-7-celebrated';

export async function loadRegistry(): Promise<ScheduledRegistryEntry[]> {
  const raw = await AsyncStorage.getItem(REGISTRY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveRegistry(entries: ScheduledRegistryEntry[]) {
  await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(entries));
}

export async function removeRegistryKeys(keys: NotificationLogicalKey[]) {
  const set = new Set(keys);
  const next = (await loadRegistry()).filter((entry) => !set.has(entry.logicalKey));
  await saveRegistry(next);
}

export async function upsertRegistryEntry(entry: ScheduledRegistryEntry) {
  const list = await loadRegistry();
  const next = list.filter((item) => item.logicalKey !== entry.logicalKey);
  next.push(entry);
  await saveRegistry(next);
}

export async function getRegistryIdsForKeys(keys: NotificationLogicalKey[]) {
  const set = new Set(keys);
  return (await loadRegistry())
    .filter((entry) => set.has(entry.logicalKey))
    .map((entry) => entry.notificationId);
}

export function todayCountKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function getDailyScheduledCount(date = new Date()): Promise<number> {
  const raw = await AsyncStorage.getItem(DAILY_COUNT_KEY);
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw) as { day: string; count: number };
    return parsed.day === todayCountKey(date) ? parsed.count : 0;
  } catch {
    return 0;
  }
}

export async function incrementDailyScheduledCount(date = new Date()) {
  const day = todayCountKey(date);
  const count = (await getDailyScheduledCount(date)) + 1;
  await AsyncStorage.setItem(DAILY_COUNT_KEY, JSON.stringify({ day, count }));
}

export async function touchLastAppOpen() {
  await AsyncStorage.setItem(LAST_OPEN_KEY, String(Date.now()));
}

export async function getLastAppOpen(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(LAST_OPEN_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function markOnboardingLeft() {
  await AsyncStorage.setItem(ONBOARDING_LEFT_KEY, String(Date.now()));
}

export async function clearOnboardingLeft() {
  await AsyncStorage.removeItem(ONBOARDING_LEFT_KEY);
}

export async function getOnboardingLeftAt(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(ONBOARDING_LEFT_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function markCheckinDraftStarted() {
  await AsyncStorage.setItem(CHECKIN_DRAFT_KEY, String(Date.now()));
}

export async function clearCheckinDraftStarted() {
  await AsyncStorage.removeItem(CHECKIN_DRAFT_KEY);
}

export async function getCheckinDraftStartedAt(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(CHECKIN_DRAFT_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function wasStreak7Celebrated(): Promise<boolean> {
  return (await AsyncStorage.getItem(STREAK7_KEY)) === '1';
}

export async function markStreak7Celebrated() {
  await AsyncStorage.setItem(STREAK7_KEY, '1');
}
