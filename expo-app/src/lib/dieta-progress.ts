import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateKey } from '@/lib/patient-local-time';

function storageKey(mealId: string, dateKey?: string) {
  return `dieta_checks_${dateKey || getLocalDateKey()}_${mealId}`;
}

export async function loadChecked(mealId: string, itemCount: number, dateKey?: string): Promise<boolean[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(mealId, dateKey));
    if (!raw) return Array(itemCount).fill(false);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return Array(itemCount).fill(false);
    if (parsed.length === itemCount) return parsed.map(Boolean);
    const next = Array(itemCount).fill(false);
    for (let i = 0; i < Math.min(parsed.length, itemCount); i += 1) {
      next[i] = Boolean(parsed[i]);
    }
    return next;
  } catch {
    return Array(itemCount).fill(false);
  }
}

export async function saveChecked(mealId: string, states: boolean[], dateKey?: string) {
  await AsyncStorage.setItem(storageKey(mealId, dateKey), JSON.stringify(states));
}

export function countDone(states: boolean[]) {
  return states.filter(Boolean).length;
}
