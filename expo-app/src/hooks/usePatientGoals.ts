import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'cf-expo-patient-goals-v1';

export type PatientGoal = {
  id: string;
  label: string;
  type: string;
  target: number;
  unit: string;
  frequency: 'daily' | 'weekly';
};

const DEFAULT_GOALS: PatientGoal[] = [
  { id: 'water', label: 'Água', type: 'water', target: 2, unit: 'litros', frequency: 'daily' },
  { id: 'food', label: 'Refeição livre', type: 'food', target: 7, unit: 'dias', frequency: 'weekly' },
  { id: 'exercise', label: 'Exercício', type: 'exercise', target: 3, unit: 'vezes', frequency: 'weekly' },
  { id: 'sleep', label: 'Sono', type: 'sleep', target: 8, unit: 'horas', frequency: 'daily' },
];

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function weekStartKey(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return dateKey(copy);
}

export function usePatientGoals() {
  const [goals, setGoals] = useState<PatientGoal[]>(DEFAULT_GOALS);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.goals) && parsed.goals.length) setGoals(parsed.goals);
          if (parsed.progress && typeof parsed.progress === 'object') setProgress(parsed.progress);
        }
      } catch {
        /* defaults */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback(async (nextGoals: PatientGoal[], nextProgress: Record<string, number>) => {
    setGoals(nextGoals);
    setProgress(nextProgress);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ goals: nextGoals, progress: nextProgress }));
  }, []);

  const todaySummary = useMemo(() => goals.map((goal) => {
    const key = goal.frequency === 'weekly'
      ? `${goal.id}:${weekStartKey()}`
      : `${goal.id}:${dateKey()}`;
    const value = Number(progress[key] || 0);
    const percent = goal.id === 'food'
      ? Math.min(100, Math.round((value / goal.target) * 100))
      : Math.min(100, Math.round((value / goal.target) * 100));
    return { goal, progress: value, percent };
  }), [goals, progress]);

  const goalsAverage = useMemo(() => {
    const items = todaySummary.filter((item) => item.goal.id !== 'food');
    if (!items.length) return 0;
    return Math.round(items.reduce((sum, item) => sum + item.percent, 0) / items.length);
  }, [todaySummary]);

  const setGoalProgress = useCallback(async (goalId: string, value: number) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const period = goal.frequency === 'weekly' ? weekStartKey() : dateKey();
    const key = `${goalId}:${period}`;
    const next = { ...progress, [key]: value };
    await persist(goals, next);
  }, [goals, persist, progress]);

  return {
    ready,
    goals,
    todaySummary,
    goalsAverage,
    setGoalProgress,
  };
}
