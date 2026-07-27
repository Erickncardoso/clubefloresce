import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePatientApi } from '@/hooks/usePatientApi';
import {
  STORAGE_KEY,
  addGoalToStore,
  buildTodaySummary,
  getFoodSelectedDays,
  getProgress,
  getSleepSchedule,
  goalsAverageFromSummary,
  readGoalsStore,
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

export type { PatientGoal, GoalsStore } from '@/lib/patient-goals-core';
export { FOOD_WEEKDAYS } from '@/lib/patient-goals-core';

export function usePatientGoals() {
  const { request } = usePatientApi();
  const [store, setStore] = useState<GoalsStore>(() => readGoalsStore(null));
  const [ready, setReady] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(async (next: GoalsStore) => {
    setStore(next);
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
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      let next = readGoalsStore(raw);
      next = repairSleepScheduleInStore(next);
      try {
        const data = await request<{ goals?: PatientGoal[]; progress?: Record<string, number> }>(
          '/patient-goals/me',
        );
        if (Array.isArray(data?.goals) && data.goals.length) {
          next = readGoalsStore(JSON.stringify({ goals: data.goals, progress: data.progress || {} }));
          next = repairSleepScheduleInStore(next);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
      } catch {
        /* local only */
      }
      setStore(next);
    } finally {
      setReady(true);
    }
  }, [request]);

  useEffect(() => {
    void hydrate();
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [hydrate]);

  const todaySummary = useMemo(() => buildTodaySummary(store), [store]);
  const goalsAverage = useMemo(() => goalsAverageFromSummary(todaySummary), [todaySummary]);
  const sleepSchedule = useMemo(() => getSleepSchedule(store), [store]);

  const incrementGoal = useCallback(async (goalId: string) => {
    if (goalId === 'food') return;
    const goal = store.goals.find((item) => item.id === goalId);
    if (!goal) return;
    const delta = goal.step ?? 1;
    const next = setProgressInStore(store, goalId, getProgress(store, goal) + delta);
    await persist(next);
  }, [persist, store]);

  const decrementGoal = useCallback(async (goalId: string) => {
    if (goalId === 'food') return;
    const goal = store.goals.find((item) => item.id === goalId);
    if (!goal) return;
    const delta = goal.step ?? 1;
    const next = setProgressInStore(store, goalId, getProgress(store, goal) - delta);
    await persist(next);
  }, [persist, store]);

  const setGoalProgress = useCallback(async (goalId: string, value: number) => {
    const next = setProgressInStore(store, goalId, value);
    await persist(next);
  }, [persist, store]);

  const toggleFoodDay = useCallback(async (dayIndex: number) => {
    const next = toggleFoodDayInStore(store, dayIndex);
    await persist(next);
  }, [persist, store]);

  const setSleepSchedule = useCallback(async (bedMinutes: number, wakeMinutes: number) => {
    const next = setSleepScheduleInStore(store, bedMinutes, wakeMinutes);
    await persist(next);
  }, [persist, store]);

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

  return {
    ready,
    goals: store.goals,
    todaySummary,
    goalsAverage,
    sleepSchedule,
    hydrate,
    incrementGoal,
    decrementGoal,
    setGoalProgress,
    getFoodSelectedDays: () => getFoodSelectedDays(store),
    toggleFoodDay,
    setSleepSchedule,
    shiftSleepTime,
    updateGoal,
    addGoal,
    weekdayIndex,
  };
}
