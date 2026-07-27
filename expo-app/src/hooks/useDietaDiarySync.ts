import { useCallback, useRef } from 'react';
import { usePatientApi } from '@/hooks/usePatientApi';
import { buildPlanDiaryItems } from '@/lib/plan-diary-sync';
import { normalizeMealItemsForSave } from '@/lib/meal-diary';
import type { MappedMealPlanMeal } from '@/lib/meal-plan-api';

export type DailySummary = {
  targets?: {
    caloriesKcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  };
  consumed?: {
    caloriesKcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  };
  entries?: Array<{
    id: string;
    mealType?: string;
    mealLabel?: string;
    caloriesKcal?: number;
    carbsG?: number;
    proteinG?: number;
    fatG?: number;
    imageUrl?: string | null;
    items?: unknown[];
  }>;
};

export function useDietaDiarySync() {
  const { request } = usePatientApi();
  const syncTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const syncMealCheck = useCallback(async (
    mealId: string,
    meal: MappedMealPlanMeal | null,
    checkedStates: boolean[],
  ) => {
    if (!mealId || !meal) return null;

    const items = buildPlanDiaryItems(meal, checkedStates);
    const res = await request<{ dailySummary?: DailySummary }>('/food-diary/plan-check', {
      method: 'PUT',
      body: JSON.stringify({
        mealType: mealId,
        mealLabel: meal.label || mealId,
        items: normalizeMealItemsForSave(items as Array<Record<string, unknown>>),
      }),
    });

    return res.dailySummary ?? null;
  }, [request]);

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
      void syncMealCheck(mealId, meal, checkedStates).then((summary) => {
        onSynced?.(summary);
      });
    }, delayMs);

    syncTimers.current.set(key, timer);
  }, [syncMealCheck]);

  return { syncMealCheck, queueSyncMealCheck };
}
