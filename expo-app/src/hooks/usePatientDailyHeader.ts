import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePatientApi } from '@/hooks/usePatientApi';
import { usePatientGoals } from '@/hooks/usePatientGoals';
import {
  getCachedDailySummary,
  saveCachedDailySummary,
} from '@/lib/patient-session-cache';
import {
  buildMonthActivityMap,
  computeBestStreak,
  computeCurrentStreak,
  countActiveDaysInMonth,
  countActiveDaysInWeek,
  dateKey,
  getWeekDateKeys,
  isActivityDay,
} from '@/lib/patient-activity-days';
import type { DailySummary } from '@/types/daily-summary';

const DEFAULT_TARGETS = {
  caloriesKcal: 2000,
  proteinG: 120,
  carbsG: 220,
  fatG: 65,
};

export function usePatientDailyHeader() {
  const { request } = usePatientApi();
  const { goals, progress, ready: goalsReady } = usePatientGoals();

  const [dailySummary, setDailySummaryState] = useState<DailySummary | null>(null);
  const [streakDays, setStreakDays] = useState(1);
  const [monthActivityMap, setMonthActivityMap] = useState<Map<string, boolean>>(() => new Map());
  const [monthDiaryDays, setMonthDiaryDays] = useState<Array<{ date: string; entryCount?: number }>>([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const monthCacheKey = useRef('');

  const setDailySummary = useCallback((summary: DailySummary | null) => {
    setDailySummaryState(summary);
    void saveCachedDailySummary(summary);
  }, []);

  useEffect(() => {
    void getCachedDailySummary().then((cached) => {
      if (cached) setDailySummaryState(cached);
    });
  }, []);

  const targets = useMemo(
    () => dailySummary?.targets ?? DEFAULT_TARGETS,
    [dailySummary?.targets],
  );

  const consumed = useMemo(
    () =>
      dailySummary?.consumed ?? {
        caloriesKcal: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
      },
    [dailySummary?.consumed],
  );

  const caloriePercent = useMemo(() => {
    if (!targets.caloriesKcal) return 0;
    return Math.min(
      100,
      Math.round(((consumed.caloriesKcal || 0) / targets.caloriesKcal) * 100),
    );
  }, [consumed.caloriesKcal, targets.caloriesKcal]);

  const activeStreak = useMemo(
    () => computeCurrentStreak(monthActivityMap),
    [monthActivityMap],
  );

  const bestStreak = useMemo(
    () => Math.max(activeStreak, computeBestStreak(monthActivityMap)),
    [activeStreak, monthActivityMap],
  );

  const streakLabel = useMemo(
    () => (activeStreak === 1 ? 'dia' : 'dias'),
    [activeStreak],
  );

  const weekActiveCount = useMemo(
    () => countActiveDaysInWeek(monthActivityMap),
    [monthActivityMap],
  );

  const weekGoal = 7;

  const weekGoalProgress = useMemo(
    () => Math.min(1, weekActiveCount / weekGoal),
    [weekActiveCount],
  );

  const weekBars = useMemo(() => {
    const keys = getWeekDateKeys(new Date());
    return keys.map((key) => {
      const date = new Date(`${key}T12:00:00`);
      return {
        key,
        active: monthActivityMap.get(key) ?? false,
        label: date.toLocaleDateString('pt-BR', { weekday: 'long' }),
        shortLabel: date.toLocaleDateString('pt-BR', { weekday: 'narrow' }).replace('.', ''),
        isToday: key === dateKey(),
      };
    });
  }, [monthActivityMap]);

  const loadDailyNutrition = useCallback(async () => {
    try {
      const summary = await request<DailySummary>('/food-diary/today');
      setDailySummary(summary);
    } catch {
      /* mantém cache do dia se existir */
    }
  }, [request, setDailySummary]);

  const loadCheckInStreak = useCallback(async () => {
    try {
      const data = await request<{ history?: unknown[]; current?: unknown }>('/checkin/me');
      setStreakDays(Math.max(1, (data.history?.length || 0) + (data.current ? 1 : 0)));
    } catch {
      setStreakDays(1);
    }
  }, [request]);

  const loadMonthActivity = useCallback(async (
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
  ) => {
    const cacheKey = `${year}-${month}`;
    if (monthCacheKey.current === cacheKey) return;

    setMonthLoading(true);
    try {
      const data = await request<{ days?: Array<{ date: string; entryCount?: number }> }>(
        `/food-diary/month?year=${year}&month=${month}`,
      );
      const diaryDays = Array.isArray(data?.days) ? data.days : [];
      setMonthDiaryDays(diaryDays);
      setMonthActivityMap(buildMonthActivityMap(goals, progress, diaryDays));
      monthCacheKey.current = cacheKey;
    } catch {
      setMonthActivityMap(buildMonthActivityMap(goals, progress, []));
      monthCacheKey.current = cacheKey;
      setMonthDiaryDays([]);
    } finally {
      setMonthLoading(false);
    }
  }, [goals, progress, request]);

  const refreshActivityForToday = useCallback(() => {
    const today = dateKey();
    const diaryDay = monthDiaryDays.find((day) => day.date === today);
    const active = isActivityDay(
      goals,
      progress,
      today,
      diaryDay?.entryCount || 0,
    );
    setMonthActivityMap((prev) => {
      if (!prev.size) return prev;
      const next = new Map(prev);
      next.set(today, active);
      return next;
    });
  }, [goals, monthDiaryDays, progress]);

  const bootstrapDailyHeader = useCallback(async () => {
    await Promise.allSettled([
      loadDailyNutrition(),
      loadCheckInStreak(),
      loadMonthActivity(),
    ]);
  }, [loadCheckInStreak, loadDailyNutrition, loadMonthActivity]);

  const monthActiveCount = useMemo(() => {
    const now = new Date();
    return countActiveDaysInMonth(monthActivityMap, now.getFullYear(), now.getMonth() + 1);
  }, [monthActivityMap]);

  return {
    dailySummary,
    setDailySummary,
    targets,
    consumed,
    caloriePercent,
    streakDays,
    streakLabel,
    activeStreak,
    bestStreak,
    weekActiveCount,
    weekGoal,
    weekGoalProgress,
    weekBars,
    monthLoading,
    monthActiveCount,
    goalsReady,
    loadDailyNutrition,
    loadCheckInStreak,
    loadMonthActivity,
    bootstrapDailyHeader,
    refreshActivityForToday,
  };
}
