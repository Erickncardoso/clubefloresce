import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  dateKey,
  getProgress,
  type GoalsStore,
  type PatientGoal,
} from '@/lib/patient-goals-core';
import {
  endWaterActivity,
  isLiveActivitySupported,
  startWaterActivity,
  syncWaterActivity,
} from '../../modules/live-activity';

const SYNC_META_KEY = 'cf-water-live-activity-sync-v1';

type SyncMeta = {
  dayKey: string;
  currentLiters: number;
  goalLiters: number;
};

let pendingOpenWaterSheet = false;
let memorySync: SyncMeta | null = null;

export function roundWaterLiters(value: number): number {
  return Math.round(Math.max(0, Number(value) || 0) * 10) / 10;
}

export function requestOpenWaterSheetFromIsland() {
  pendingOpenWaterSheet = true;
}

export function consumeOpenWaterSheetFromIsland(): boolean {
  const pending = pendingOpenWaterSheet;
  pendingOpenWaterSheet = false;
  return pending;
}

function waterGoal(store: GoalsStore): PatientGoal | undefined {
  return store.goals.find((item) => item.id === 'water');
}

async function readSyncMeta(): Promise<SyncMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SyncMeta;
  } catch {
    return null;
  }
}

async function writeSyncMeta(meta: SyncMeta) {
  memorySync = meta;
  try {
    await AsyncStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  } catch {
    /* cache opcional */
  }
}

function sameSync(a: SyncMeta | null, b: SyncMeta): boolean {
  if (!a) return false;
  return a.dayKey === b.dayKey
    && a.currentLiters === b.currentLiters
    && a.goalLiters === b.goalLiters;
}

/** Sincroniza litros/meta com a Live Activity — OTA-safe (só dados, não layout). */
export async function syncWaterLiveActivityFromStore(
  store: GoalsStore,
  options?: { force?: boolean; preferRestart?: boolean },
): Promise<boolean> {
  if (!isLiveActivitySupported()) return false;

  const water = waterGoal(store);
  if (!water) {
    await endWaterActivity();
    memorySync = null;
    return false;
  }

  const currentLiters = roundWaterLiters(getProgress(store, water));
  const goalLiters = roundWaterLiters(Number(water.target) || 0);

  if (goalLiters <= 0) {
    await endWaterActivity();
    memorySync = null;
    return false;
  }

  const today = dateKey();
  const payload: SyncMeta = { dayKey: today, currentLiters, goalLiters };

  if (!options?.force && sameSync(memorySync, payload)) {
    return true;
  }

  const stored = memorySync || await readSyncMeta();
  const newDay = Boolean(stored?.dayKey && stored.dayKey !== today);
  const goalChanged = Boolean(stored && stored.goalLiters !== goalLiters);
  const shouldRestart = Boolean(options?.preferRestart || newDay || goalChanged);

  let ok = false;
  if (shouldRestart) {
    ok = await startWaterActivity(currentLiters, goalLiters);
  } else {
    ok = await syncWaterActivity(currentLiters, goalLiters);
    if (!ok) {
      ok = await startWaterActivity(currentLiters, goalLiters);
    }
  }

  if (ok) {
    await writeSyncMeta(payload);
  }

  return ok;
}

export function getWaterLiveActivitySnapshot(store: GoalsStore) {
  const water = waterGoal(store);
  if (!water) return null;
  const currentLiters = roundWaterLiters(getProgress(store, water));
  const goalLiters = roundWaterLiters(Number(water.target) || 0);
  if (goalLiters <= 0) return null;
  const percent = Math.min(100, Math.round((currentLiters / goalLiters) * 100));
  const remainingMl = Math.max(0, Math.round((goalLiters - currentLiters) * 1000));
  return { currentLiters, goalLiters, percent, remainingMl };
}

export function isLiveActivityDeepLink(url: string | null | undefined): boolean {
  if (!url) return false;
  const normalized = url.trim().toLowerCase();
  return normalized === 'clubeflorescer://'
    || normalized.startsWith('clubeflorescer://inicio')
    || normalized.startsWith('clubeflorescer://water')
    || normalized.startsWith('clubeflorescer://hydration');
}
