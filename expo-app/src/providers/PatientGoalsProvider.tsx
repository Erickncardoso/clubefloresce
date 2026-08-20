import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePatientApi } from '@/hooks/usePatientApi';
import { useAppToast } from '@/providers/AppToastProvider';
import { buildGoalCheckToast } from '@/lib/goal-check-toast';
import {
  STORAGE_KEY,
  addGoalToStore,
  buildTodaySummary,
  getFoodSelectedDays,
  getProgress,
  getSleepSchedule,
  goalsAverageFromSummary,
  readGoalsStore,
  stripOrphanAutoSleepProgress,
  repairSleepScheduleInStore,
  setProgressInStore,
  setSleepScheduleInStore,
  shiftSleepTimeInStore,
  toggleFoodDayInStore,
  updateGoalInStore,
  weekdayIndex,
  type GoalsStore,
  type PatientGoal,
} from '@/lib/patient-goals-core';
import { syncWaterActivity } from '../../modules/live-activity';

const HYDRATE_API_TIMEOUT_MS = 8000;

function syncWaterLiveActivity(next: GoalsStore) {
  const water = next.goals.find((item) => item.id === 'water');
  if (!water) return;
  void syncWaterActivity(getProgress(next, water), Number(water.target) || 0);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

type PatientGoalsContextValue = {
  ready: boolean;
  goals: PatientGoal[];
  progress: GoalsStore['progress'];
  todaySummary: ReturnType<typeof buildTodaySummary>;
  goalsAverage: number;
  sleepSchedule: ReturnType<typeof getSleepSchedule>;
  hydrate: () => Promise<void>;
  incrementGoal: (goalId: string, step?: number, options?: { silent?: boolean }) => Promise<void>;
  decrementGoal: (goalId: string, step?: number) => Promise<void>;
  setGoalProgress: (goalId: string, value: number) => Promise<void>;
  getFoodSelectedDays: () => number[];
  toggleFoodDay: (dayIndex: number, options?: { silent?: boolean }) => Promise<void>;
  setSleepSchedule: (
    bedMinutes: number,
    wakeMinutes: number,
    options?: { notify?: boolean },
  ) => Promise<void>;
  shiftSleepTime: (kind: 'bed' | 'wake', deltaMinutes: number) => Promise<void>;
  updateGoal: (
    goalId: string,
    patch: Partial<Pick<PatientGoal, 'label' | 'target' | 'unit' | 'frequency'>>,
  ) => Promise<void>;
  addGoal: (goal: Omit<PatientGoal, 'id'>) => Promise<void>;
  weekdayIndex: typeof weekdayIndex;
};

const PatientGoalsContext = createContext<PatientGoalsContextValue | null>(null);

/** Estado global de metas — espelha `usePatientGoals()` do PWA. */
export function PatientGoalsProvider({ children }: { children: ReactNode }) {
  const { request, token } = usePatientApi();
  const { showToast } = useAppToast();
  const [store, setStore] = useState<GoalsStore>(() => readGoalsStore(null));
  const [ready, setReady] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeRef = useRef(store);
  storeRef.current = store;

  const persist = useCallback(async (next: GoalsStore) => {
    setStore(next);
    storeRef.current = next;
    syncWaterLiveActivity(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        await request('/patient-goals/me', {
          method: 'PUT',
          body: JSON.stringify({ goals: next.goals, progress: next.progress }),
        });
      } catch {
        /* sync opcional */
      }
    }, 900);
  }, [request]);

  const hydrate = useCallback(async () => {
    let next = readGoalsStore(null);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      next = readGoalsStore(raw);
      next = stripOrphanAutoSleepProgress(next);
      next = repairSleepScheduleInStore(next);
    } catch {
      /* defaults locais */
    }

    setStore(next);
    storeRef.current = next;
    syncWaterLiveActivity(next);
    setReady(true);

    if (!token) return;

    try {
      const data = await withTimeout(
        request<{ goals?: PatientGoal[]; progress?: Record<string, number> }>(
          '/patient-goals/me',
        ),
        HYDRATE_API_TIMEOUT_MS,
      );
      if (Array.isArray(data?.goals) && data.goals.length) {
        next = readGoalsStore(JSON.stringify({ goals: data.goals, progress: data.progress || {} }));
        next = repairSleepScheduleInStore(next);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setStore(next);
        storeRef.current = next;
        syncWaterLiveActivity(next);
      }
    } catch {
      /* mantém cache local */
    }
  }, [request, token]);

  useEffect(() => {
    void hydrate();
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [hydrate]);

  const todaySummary = useMemo(() => buildTodaySummary(store), [store]);
  const goalsAverage = useMemo(() => goalsAverageFromSummary(todaySummary), [todaySummary]);
  const sleepSchedule = useMemo(() => getSleepSchedule(store), [store]);

  const incrementGoal = useCallback(async (
    goalId: string,
    step?: number,
    options?: { silent?: boolean },
  ) => {
    if (goalId === 'food') return;
    const current = storeRef.current;
    const goal = current.goals.find((item) => item.id === goalId);
    if (!goal) return;
    const delta = step ?? goal.step ?? 1;
    const next = setProgressInStore(current, goalId, getProgress(current, goal) + delta);
    storeRef.current = next;
    await persist(next);
    if (!options?.silent) {
      showToast(buildGoalCheckToast(goalId, { goal, stepLiters: goalId === 'water' ? delta : undefined }));
    }
  }, [persist, showToast]);

  const decrementGoal = useCallback(async (goalId: string, step?: number) => {
    if (goalId === 'food') return;
    const current = storeRef.current;
    const goal = current.goals.find((item) => item.id === goalId);
    if (!goal) return;
    const delta = step ?? goal.step ?? 1;
    const next = setProgressInStore(current, goalId, getProgress(current, goal) - delta);
    storeRef.current = next;
    await persist(next);
  }, [persist]);

  const setGoalProgress = useCallback(async (goalId: string, value: number) => {
    const next = setProgressInStore(storeRef.current, goalId, value);
    storeRef.current = next;
    await persist(next);
  }, [persist]);

  const toggleFoodDay = useCallback(async (dayIndex: number, options?: { silent?: boolean }) => {
    const wasSelected = getFoodSelectedDays(store).includes(dayIndex);
    const next = toggleFoodDayInStore(store, dayIndex);
    await persist(next);
    if (!options?.silent && !wasSelected) {
      showToast(buildGoalCheckToast('food'));
    }
  }, [persist, showToast, store]);

  const setSleepScheduleFn = useCallback(async (
    bedMinutes: number,
    wakeMinutes: number,
    options?: { notify?: boolean },
  ) => {
    const next = setSleepScheduleInStore(store, bedMinutes, wakeMinutes);
    await persist(next);
    if (options?.notify) {
      let duration = wakeMinutes - bedMinutes;
      if (duration <= 0) duration += 1440;
      showToast(buildGoalCheckToast('sleep', { sleepDurationMinutes: duration }));
    }
  }, [persist, showToast, store]);

  const shiftSleepTime = useCallback(async (kind: 'bed' | 'wake', deltaMinutes: number) => {
    const next = shiftSleepTimeInStore(store, kind, deltaMinutes);
    await persist(next);
  }, [persist, store]);

  const updateGoal = useCallback(async (
    goalId: string,
    patch: Partial<Pick<PatientGoal, 'label' | 'target' | 'unit' | 'frequency'>>,
  ) => {
    const next = updateGoalInStore(store, goalId, patch);
    await persist(next);
  }, [persist, store]);

  const addGoal = useCallback(async (goal: Omit<PatientGoal, 'id'>) => {
    const next = addGoalToStore(store, goal);
    await persist(next);
  }, [persist, store]);

  const value = useMemo<PatientGoalsContextValue>(() => ({
    ready,
    goals: store.goals,
    progress: store.progress,
    todaySummary,
    goalsAverage,
    sleepSchedule,
    hydrate,
    incrementGoal,
    decrementGoal,
    setGoalProgress,
    getFoodSelectedDays: () => getFoodSelectedDays(store),
    toggleFoodDay,
    setSleepSchedule: setSleepScheduleFn,
    shiftSleepTime,
    updateGoal,
    addGoal,
    weekdayIndex,
  }), [
    addGoal,
    decrementGoal,
    goalsAverage,
    hydrate,
    incrementGoal,
    ready,
    setGoalProgress,
    setSleepScheduleFn,
    shiftSleepTime,
    sleepSchedule,
    store,
    todaySummary,
    toggleFoodDay,
    updateGoal,
  ]);

  return (
    <PatientGoalsContext.Provider value={value}>
      {children}
    </PatientGoalsContext.Provider>
  );
}

export function usePatientGoals() {
  const ctx = useContext(PatientGoalsContext);
  if (!ctx) {
    throw new Error('usePatientGoals deve ser usado dentro de PatientGoalsProvider');
  }
  return ctx;
}

export type { PatientGoal, GoalsStore } from '@/lib/patient-goals-core';
export { FOOD_WEEKDAYS } from '@/lib/patient-goals-core';
