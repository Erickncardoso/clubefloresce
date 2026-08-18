import { useCallback, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateKey } from '@/lib/patient-local-time';
import type { MappedMealPlanMeal, MealPlanFoodItem } from '@/lib/meal-plan-api';

type OverrideItem = MealPlanFoodItem & {
  display: string;
  isSubstituted?: boolean;
  originalDisplay?: string;
  activeSubstitute?: OverrideItem;
};

let revision = 0;
const listeners = new Set<() => void>();
const cache: Record<string, Record<string, OverrideItem>> = {};
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

function asOverrideMap(parsed: unknown): Record<string, OverrideItem> {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return parsed as Record<string, OverrideItem>;
}

function storageKey(mealId: string) {
  return `dieta_overrides_${getLocalDateKey()}_${mealId}`;
}

function cacheKey(mealId: string) {
  return `${getLocalDateKey()}_${mealId}`;
}

function slugify(value: string) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function normalizeOverrideDisplay(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function resolveOverrideDisplay(item: Partial<OverrideItem> | null | undefined) {
  if (!item) return '';
  return item.display || item.name || '';
}

function normalizeOverrideItem(item: Partial<OverrideItem> | null | undefined): OverrideItem | null {
  if (!item) return null;
  const name = String(item.name || item.food || '').trim();
  if (!name) return null;

  return {
    ...item,
    key: item.key || `sub-${slugify(name)}`,
    name,
    display: item.display || item.label || name,
    unit: item.unit || 'porcao',
  } as OverrideItem;
}

async function readFromStorage(mealId: string): Promise<Record<string, OverrideItem>> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(mealId));
    if (!raw) return {};
    return asOverrideMap(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

export function useMealItemOverrides() {
  const overridesRevision = useSyncExternalStore(subscribe, getRevision, getRevision);

  const ensureLoaded = useCallback((mealId: string) => {
    if (!mealId) return;
    const key = cacheKey(mealId);
    if (key in cache || inflight.has(key)) return;

    inflight.add(key);
    cache[key] = {};
    void readFromStorage(mealId)
      .then((overrides) => {
        cache[key] = overrides;
        if (Object.keys(overrides).length > 0) bumpRevision();
      })
      .finally(() => {
        inflight.delete(key);
      });
  }, []);

  const getOverrides = useCallback((mealId: string) => {
    ensureLoaded(mealId);
    return cache[cacheKey(mealId)] || {};
  }, [ensureLoaded]);

  const persistOverrides = useCallback(async (mealId: string, overrides: Record<string, OverrideItem>) => {
    cache[cacheKey(mealId)] = overrides;
    bumpRevision();
    await AsyncStorage.setItem(storageKey(mealId), JSON.stringify(overrides));
  }, []);

  const isSameOverride = useCallback((a: Partial<OverrideItem> | null | undefined, b: Partial<OverrideItem> | null | undefined) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    const aDisplay = normalizeOverrideDisplay(resolveOverrideDisplay(a));
    const bDisplay = normalizeOverrideDisplay(resolveOverrideDisplay(b));
    if (!aDisplay || !bDisplay) return false;
    return aDisplay === bDisplay;
  }, []);

  const setOverride = useCallback((
    mealId: string,
    itemKey: string,
    substituteItem: Partial<OverrideItem> | null | undefined,
  ) => {
    const current = { ...getOverrides(mealId) };
    const normalized = normalizeOverrideItem(substituteItem);
    const existing = current[itemKey] || null;

    if (!normalized) {
      if (!existing) return;
      delete current[itemKey];
    } else if (existing && isSameOverride(existing, normalized)) {
      return;
    } else {
      current[itemKey] = normalized;
    }

    void persistOverrides(mealId, current);
  }, [getOverrides, isSameOverride, persistOverrides]);

  const clearOverride = useCallback((mealId: string, itemKey: string) => {
    setOverride(mealId, itemKey, null);
  }, [setOverride]);

  const getOverrideForItem = useCallback((mealId: string, itemKey: string) => {
    return getOverrides(mealId)[itemKey] || null;
  }, [getOverrides]);

  const applyOverridesToMeal = useCallback((meal: MappedMealPlanMeal | null, mealId: string) => {
    if (!meal) return null;

    const overrides = getOverrides(mealId);
    const items = (meal.items || []).map((item) => {
      const override = item.key ? overrides[item.key] : undefined;
      if (!override) {
        return { ...item, isSubstituted: false };
      }

      const normalized = normalizeOverrideItem(override);
      if (!normalized) return { ...item, isSubstituted: false };

      return {
        ...item,
        ...normalized,
        display: normalized.display || item.display || item.name || '',
        originalDisplay: item.display || item.name || '',
        isSubstituted: true,
        activeSubstitute: normalized,
      };
    });

    return {
      ...meal,
      items,
      itemLabels: items.map((entry) => entry.display || entry.name || ''),
    };
  }, [getOverrides, overridesRevision]);

  return {
    overridesRevision,
    getOverrides,
    setOverride,
    clearOverride,
    getOverrideForItem,
    isSameOverride,
    applyOverridesToMeal,
  };
}
