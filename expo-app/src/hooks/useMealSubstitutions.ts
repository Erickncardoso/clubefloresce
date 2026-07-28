import { useCallback, useMemo } from 'react';
import { usePatientMealPlan } from '@/hooks/usePatientMealPlan';
import { useMealPlan } from '@/hooks/useMealPlan';
import type { MealPlanFoodItem } from '@/lib/meal-plan-api';

export type SubstitutionGroup = {
  key: string;
  prescribed: MealPlanFoodItem;
  prescribedLabel: string;
  options: Array<MealPlanFoodItem & { label: string; note: string }>;
};

export function useMealSubstitutions() {
  const { planRecord } = usePatientMealPlan();
  const { getRawMealById } = useMealPlan(planRecord);

  const pdfSource = useMemo(() => ({
    fileName: planRecord?.fileName || 'plano-alimentar.pdf',
    label: planRecord?.title || 'Plano alimentar prescrito',
  }), [planRecord]);

  const getSubstitutionGroupsForMeal = useCallback((mealId: string): SubstitutionGroup[] => {
    const meal = getRawMealById(mealId);
    if (!meal) return [];

    return (meal.items || [])
      .filter((item) => item.substitutions?.length)
      .map((item) => ({
        key: item.key || item.name || '',
        prescribed: item,
        prescribedLabel: item.display || item.name || '',
        options: (item.substitutions || []).map((option) => ({
          ...option,
          label: option.display || option.name || '',
          note: option.note
            || (option.substitutionType === 'group'
              ? 'Grupo alimentar'
              : option.substitutionType === 'recipe'
                ? 'Receita'
                : ''),
        })),
      }));
  }, [getRawMealById]);

  const mealHasSubstitutions = useCallback((mealId: string) => {
    return getSubstitutionGroupsForMeal(mealId).length > 0;
  }, [getSubstitutionGroupsForMeal]);

  return {
    pdfSource,
    getSubstitutionGroupsForMeal,
    mealHasSubstitutions,
  };
}
