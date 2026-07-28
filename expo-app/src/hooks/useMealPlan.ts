import { useCallback, useMemo } from 'react';
import { pickMealIcon } from '@/lib/meal-slot-icons';
import {
  activeMeals,
  findOptionGroupForMealId,
  groupMealOptions,
  mealSlotDisplayLabel,
  needsMealOptionSelection,
} from '@/lib/meal-plan-options';
import { getMealIdForTimeFromMeals } from '@/lib/meal-plan-time';
import type { MappedMealPlanMeal, MealPlanFoodItem, MealPlanMeal, PatientMealPlanRecord } from '@/lib/meal-plan-api';
import { useMealExtraItems } from '@/hooks/useMealExtraItems';
import { useMealItemOverrides } from '@/hooks/useMealItemOverrides';

function mealShortLabel(label: string): string {
  const head = label.split('-')[0]?.trim() || label;
  const parts = head.split(':');
  return (parts[parts.length - 1]?.trim() || head).slice(0, 12);
}

function mapFoodItem(item: MealPlanFoodItem): MealPlanFoodItem {
  const name = String(item.name || item.food || '').trim();
  return {
    ...item,
    name,
    display: item.display || name || 'Alimento',
    substitutions: (item.substitutions || []).map(mapFoodItem),
  };
}

function mapApiMeal(meal: MealPlanMeal, index: number, total: number): MappedMealPlanMeal {
  const items = (meal.items || []).map(mapFoodItem);
  const displayLabel = mealSlotDisplayLabel(meal.label);
  return {
    ...meal,
    label: displayLabel,
    index: index + 1,
    total,
    short: mealShortLabel(displayLabel),
    icon: pickMealIcon(displayLabel),
    items,
    itemLabels: items.map((item) => item.display || item.name || ''),
  };
}

export function useMealPlan(planRecord: PatientMealPlanRecord | null) {
  const { applyExtraItemsToMeal, extrasRevision } = useMealExtraItems();
  const { applyOverridesToMeal, overridesRevision } = useMealItemOverrides();

  const rawApiMeals = useMemo(() => planRecord?.plan?.meals ?? [], [planRecord]);
  const selectedMealBySlot = useMemo(
    () => planRecord?.plan?.selectedMealBySlot || {},
    [planRecord],
  );

  const apiMeals = useMemo(
    () => activeMeals(rawApiMeals, selectedMealBySlot),
    [rawApiMeals, selectedMealBySlot],
  );

  const mealOrder = useMemo(() => apiMeals.map((meal) => meal.id), [apiMeals]);

  const mealList = useMemo(
    () => apiMeals.map((meal, index) => {
      const mapped = mapApiMeal(meal, index, apiMeals.length);
      return {
        id: mapped.id,
        short: mapped.short,
        icon: mapped.icon,
        time: mapped.time,
        label: mapped.label,
      };
    }),
    [apiMeals],
  );

  const optionGroups = useMemo(() => groupMealOptions(rawApiMeals), [rawApiMeals]);
  const needsOptionSelection = useMemo(
    () => needsMealOptionSelection(rawApiMeals, selectedMealBySlot),
    [rawApiMeals, selectedMealBySlot],
  );

  const getRawMealById = useCallback((mealId: string) => {
    const index = apiMeals.findIndex((meal) => meal.id === mealId);
    if (index < 0) return null;
    return mapApiMeal(apiMeals[index], index, apiMeals.length);
  }, [apiMeals]);

  const getMealById = useCallback((mealId: string) => {
    void extrasRevision;
    void overridesRevision;
    const mapped = getRawMealById(mealId);
    if (!mapped) return null;
    const withOverrides = applyOverridesToMeal(mapped, mealId);
    return applyExtraItemsToMeal(withOverrides, mealId);
  }, [applyExtraItemsToMeal, applyOverridesToMeal, extrasRevision, getRawMealById, overridesRevision]);

  const getMealIdForTime = useCallback((date = new Date()) => {
    return getMealIdForTimeFromMeals(apiMeals, date) || mealOrder[0] || '';
  }, [apiMeals, mealOrder]);

  const optionGroupForMeal = useCallback((mealId: string) => {
    return findOptionGroupForMealId(rawApiMeals, mealId);
  }, [rawApiMeals]);

  const mealHasOptionAlternatives = useCallback((mealId: string) => {
    return Boolean(optionGroupForMeal(mealId));
  }, [optionGroupForMeal]);

  return {
    rawApiMeals,
    selectedMealBySlot,
    apiMeals,
    mealOrder,
    mealList,
    optionGroups,
    needsOptionSelection,
    getMealById,
    getRawMealById,
    getMealIdForTime,
    optionGroupForMeal,
    mealHasOptionAlternatives,
    hasPlan: rawApiMeals.length > 0,
  };
}
