import { useCallback, useRef } from 'react';
import { useDiaryDate } from '@/hooks/useDiaryDate';
import { usePatientApi } from '@/hooks/usePatientApi';
import { buildPlanDiaryItems } from '@/lib/plan-diary-sync';
import { normalizeMealItemsForSave } from '@/lib/meal-diary';
import type { MappedMealPlanMeal } from '@/lib/meal-plan-api';
import type { DailySummary } from '@/types/daily-summary';

export type { DailySummary } from '@/types/daily-summary';

export function useDietaDiarySync() {
  const { request } = usePatientApi();
  const { foodDiaryPath } = useDiaryDate();
  const syncTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const syncMealCheck = useCallback(async (
    mealId: string,
    meal: MappedMealPlanMeal | null,
    checkedStates: boolean[],
  ) => {
    if (!mealId || !meal) return null;

    const items = buildPlanDiaryItems(meal, checkedStates);
    const res = await request<{ dailySummary?: DailySummary }>(foodDiaryPath('/food-diary/plan-check'), {
      method: 'PUT',
      body: JSON.stringify({
        mealType: mealId,
        mealLabel: meal.label || mealId,
        items: normalizeMealItemsForSave(items as Array<Record<string, unknown>>),
      }),
    });

    return res.dailySummary ?? null;
  }, [foodDiaryPath, request]);

  const queueSyncMealCheck = useCallback((
    mealId: string,
    meal: MappedMealPlanMeal | null,
    checkedStates: boolean[],
    onSynced?: (summary: DailySummary | null) => void,
    delayMs = 350,
  ) => {
    const key = String(mealId);
    const existing = syncTimers.current.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      syncTimers.current.delete(key);
      void syncMealCheck(mealId, meal, checkedStates)
        .then((summary) => {
          onSynced?.(summary);
        })
        .catch(() => {
          onSynced?.(null);
        });
    }, delayMs);

    syncTimers.current.set(key, timer);
  }, [syncMealCheck]);

  const resyncAllCheckedMeals = useCallback(async (
    getMealById: (mealId: string) => MappedMealPlanMeal | null,
    mealIds: string[],
    loadCheckedFn: (mealId: string, count: number) => Promise<boolean[]> | boolean[],
    countDoneFn: (states: boolean[]) => number,
  ) => {
    const jobs = mealIds.map(async (mealId) => {
      const meal = getMealById(mealId);
      if (!meal?.items?.length && !meal?.itemLabels?.length) return null;

      const count = meal.itemLabels?.length || meal.items?.length || 0;
      const states = await Promise.resolve(loadCheckedFn(mealId, count));
      if (!countDoneFn(states)) return null;

      return syncMealCheck(mealId, meal, states);
    });

    const results = await Promise.all(jobs);
    for (let i = results.length - 1; i >= 0; i -= 1) {
      if (results[i]) return results[i];
    }
    return null;
  }, [syncMealCheck]);

  return { syncMealCheck, queueSyncMealCheck, resyncAllCheckedMeals };
}
