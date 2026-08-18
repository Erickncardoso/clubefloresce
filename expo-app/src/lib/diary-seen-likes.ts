import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'cf-diary-seen-likes-v1';

export type SeenLikesMap = Record<string, number>;

export async function loadSeenDiaryLikes(): Promise<SeenLikesMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SeenLikesMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveSeenDiaryLikes(map: SeenLikesMap) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function markDiaryLikesSeen(entries: Array<{ id: string; likesCount?: number }>) {
  const current = await loadSeenDiaryLikes();
  let changed = false;
  for (const entry of entries) {
    const count = Number(entry.likesCount) || 0;
    if ((current[entry.id] || 0) < count) {
      current[entry.id] = count;
      changed = true;
    }
  }
  if (changed) await saveSeenDiaryLikes(current);
}

export function unseenLikedEntryIds(
  entries: Array<{ id: string; likesCount?: number }>,
  seen: SeenLikesMap,
) {
  return entries
    .filter((entry) => (Number(entry.likesCount) || 0) > (seen[entry.id] || 0))
    .map((entry) => entry.id);
}
