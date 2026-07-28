import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@cf/community-blocked-user-ids';

function normalizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((id) => String(id || '').trim()).filter(Boolean))];
}

export async function loadCommunityBlockedUserIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function saveCommunityBlockedUserIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeIds(ids)));
}

export async function blockCommunityUser(userId: string): Promise<string[]> {
  const normalized = String(userId || '').trim();
  if (!normalized) return loadCommunityBlockedUserIds();
  const current = await loadCommunityBlockedUserIds();
  if (current.includes(normalized)) return current;
  const next = [...current, normalized];
  await saveCommunityBlockedUserIds(next);
  return next;
}

export async function unblockCommunityUser(userId: string): Promise<string[]> {
  const normalized = String(userId || '').trim();
  const next = (await loadCommunityBlockedUserIds()).filter((id) => id !== normalized);
  await saveCommunityBlockedUserIds(next);
  return next;
}

export function isCommunityUserBlocked(blockedIds: string[], userId?: string | null): boolean {
  const normalized = String(userId || '').trim();
  if (!normalized) return false;
  return blockedIds.includes(normalized);
}
