import { useCallback, useMemo, useState } from 'react';
import { usePatientApi } from '@/hooks/usePatientApi';
import { usePatientMealPlan } from '@/hooks/usePatientMealPlan';
import {
  findOptionGroupForMealId,
  groupMealOptions,
  needsMealOptionSelection,
} from '@/lib/meal-plan-options';

export function useMealPlanOptionSelections() {
  const { request } = usePatientApi();
  const { planRecord, setPlanRecord } = usePatientMealPlan();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const rawMeals = useMemo(() => planRecord?.plan?.meals ?? [], [planRecord]);
  const selectedMealBySlot = useMemo(
    () => planRecord?.plan?.selectedMealBySlot || {},
    [planRecord],
  );

  const optionGroups = useMemo(() => groupMealOptions(rawMeals), [rawMeals]);
  const needsOptionSelection = useMemo(
    () => needsMealOptionSelection(rawMeals, selectedMealBySlot),
    [rawMeals, selectedMealBySlot],
  );

  const optionGroupForMeal = useCallback((mealId: string) => {
    return findOptionGroupForMealId(rawMeals, mealId);
  }, [rawMeals]);

  const mealHasOptionAlternatives = useCallback((mealId: string) => {
    return Boolean(optionGroupForMeal(mealId));
  }, [optionGroupForMeal]);

  const saveSelections = useCallback(async (nextSelected: Record<string, string>) => {
    if (!planRecord) {
      throw new Error('Nenhum plano alimentar carregado.');
    }

    setSaving(true);
    setSaveError('');

    try {
      const res = await request<{ plan?: typeof planRecord }>('/meal-plan/me/selections', {
        method: 'PATCH',
        body: JSON.stringify({ selectedMealBySlot: nextSelected }),
      });
      const nextPlan = res.plan ?? planRecord;
      setPlanRecord(nextPlan);
      return nextPlan;
    } catch (err) {
      const message = (err as Error).message || 'Não foi possível salvar as opções.';
      setSaveError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [planRecord, request, setPlanRecord]);

  return {
    rawMeals,
    selectedMealBySlot,
    optionGroups,
    needsOptionSelection,
    saving,
    saveError,
    optionGroupForMeal,
    mealHasOptionAlternatives,
    saveSelections,
  };
}
