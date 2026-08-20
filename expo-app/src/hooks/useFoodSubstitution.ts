import { useCallback } from 'react';
import { usePatientApi } from '@/hooks/usePatientApi';

type FoodSearchItem = {
  id: string;
  name: string;
  displayName?: string;
  category?: string;
  per100g?: {
    caloriesKcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  };
};

type SubstitutionPayload = {
  foodId: string;
  grams: number;
  mode: string;
  criterion: string;
  groupFilter: string;
  replacementId?: string;
  limit?: number;
  mealLabel?: string;
};

export function useFoodSubstitution() {
  const { request } = usePatientApi();

  const searchFoods = useCallback(async (query: string, limit = 12): Promise<FoodSearchItem[]> => {
    const q = String(query || '').trim();
    if (!q) return [];
    const result = await request<{ items?: FoodSearchItem[] }>(
      `/foods/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    );
    return result?.items || [];
  }, [request]);

  const calculateSubstitution = useCallback(async (payload: SubstitutionPayload) => {
    return request('/foods/substitute', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }, [request]);

  return { searchFoods, calculateSubstitution };
}
