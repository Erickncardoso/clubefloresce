import { useCallback, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMealItemId } from '@/lib/meal-diary';
import { formatExtraItemLabel, resolveExtraItemGrams } from '@/lib/meal-extra-quantity';
import { macrosForFoodRecord } from '@/lib/food-bank';
import { getLocalDateKey } from '@/lib/patient-local-time';
import type { MappedMealPlanMeal, MealPlanFoodItem } from '@/lib/meal-plan-api';

export type ExtraFoodItem = MealPlanFoodItem & {
  id: string;
  key: string;
  name: string;
  foodId: string | null;
  amount: number;
  unit: string;
  grams: number;
  display: string;
  caloriesKcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  source: string;
  isExtra: true;
};

let revision = 0;
const listeners = new Set<() => void>();
const cache: Record<string, ExtraFoodItem[]> = {};
const inflight = new Set<string>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getRevision() {
  return revision;
}

function bumpRevision() {
  revision += 1;
  listeners.forEach((listener) => listener());
}

function storageKey(mealId: string) {
  return `dieta_extras_${getLocalDateKey()}_${mealId}`;
}

function cacheKey(mealId: string) {
  return `${getLocalDateKey()}_${mealId}`;
}

function normalizeExtraItem(item: Partial<ExtraFoodItem>): ExtraFoodItem | null {
  if (!item?.id || !item?.name) return null;

  const amount = Number(item.amount);
  const unit = item.unit || 'g';
  const grams = Math.max(1, Math.round(Number(item.grams) || resolveExtraItemGrams(amount, unit, item.name)));

  return {
    id: item.id,
    key: item.key || item.id,
    name: item.name,
    foodId: item.foodId || null,
    amount: Number.isFinite(amount) ? amount : grams,
    unit,
    grams,
    display: item.display || formatExtraItemLabel(item.name, amount, unit),
    caloriesKcal: item.caloriesKcal ?? 0,
    carbsG: item.carbsG ?? 0,
    proteinG: item.proteinG ?? 0,
    fatG: item.fatG ?? 0,
    source: item.source || 'food_bank',
    isExtra: true,
  };
}

async function readFromStorage(mealId: string): Promise<ExtraFoodItem[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(mealId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeExtraItem(item as Partial<ExtraFoodItem>)).filter(Boolean) as ExtraFoodItem[];
  } catch {
    return [];
  }
}

export function useMealExtraItems() {
  const extrasRevision = useSyncExternalStore(subscribe, getRevision, getRevision);

  const getExtraItems = useCallback((mealId: string) => {
    if (!mealId) return cache[cacheKey(mealId)] || [];
    const key = cacheKey(mealId);
    if (!(key in cache) && !inflight.has(key)) {
      inflight.add(key);
      cache[key] = [];
      void readFromStorage(mealId)
        .then((items) => {
          cache[key] = items;
          if (items.length > 0) bumpRevision();
        })
        .finally(() => {
          inflight.delete(key);
        });
    }
    return cache[key] || [];
  }, []);

  const persistExtras = useCallback(async (mealId: string, items: ExtraFoodItem[]) => {
    const key = cacheKey(mealId);
    cache[key] = items;
    bumpRevision();
    await AsyncStorage.setItem(storageKey(mealId), JSON.stringify(items));
  }, []);

  const addExtraItem = useCallback((
    mealId: string,
    food: { id?: string; name: string; per100g?: { caloriesKcal?: number } },
    amount: number,
    unit = 'g',
  ) => {
    if (!food?.name) return null;

    const normalizedAmount = Number(amount);
    const safeAmount = Number.isFinite(normalizedAmount) && normalizedAmount > 0 ? normalizedAmount : 100;
    const safeUnit = unit || 'g';
    const grams = resolveExtraItemGrams(safeAmount, safeUnit, food.name);
    if (grams <= 0) return null;

    const item: ExtraFoodItem = {
      id: createMealItemId(),
      key: `extra-${createMealItemId()}`,
      name: food.name,
      foodId: food.id || null,
      amount: safeAmount,
      unit: safeUnit,
      grams,
      display: formatExtraItemLabel(food.name, safeAmount, safeUnit),
      source: 'food_bank',
      isExtra: true,
      ...macrosForFoodRecord(food, grams),
    };

    const current = cache[cacheKey(mealId)] || [];
    void persistExtras(mealId, [...current, item]);
    return item;
  }, [persistExtras]);

  const removeExtraItem = useCallback((mealId: string, itemId: string) => {
    const current = cache[cacheKey(mealId)] || [];
    void persistExtras(mealId, current.filter((item) => item.id !== itemId));
  }, [persistExtras]);

  const applyExtraItemsToMeal = useCallback((meal: MappedMealPlanMeal | null, mealId: string) => {
    if (!meal) return null;

    const extras = cache[cacheKey(mealId)] || [];
    if (!extras.length) return meal;

    const items = [...(meal.items || []), ...extras];
    return {
      ...meal,
      items,
      itemLabels: items.map((item) => item.display || item.name || ''),
    };
  }, [extrasRevision]);

  return {
    extrasRevision,
    getExtraItems,
    addExtraItem,
    removeExtraItem,
    applyExtraItemsToMeal,
  };
}
