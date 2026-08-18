import type { Router } from 'expo-router';

export type MealDiaryPhotoTarget = {
  id: string;
  label?: string | null;
};

export type MealDiaryPhotoSource = 'home' | 'dieta' | 'diario';

export function openMealDiaryPhoto(
  router: Router,
  meal: MealDiaryPhotoTarget,
  source: MealDiaryPhotoSource = 'dieta',
) {
  if (!meal.id) return;
  router.push({
    pathname: '/bella/chat/meal-photo',
    params: {
      from: source,
      meal: meal.id,
      label: meal.label || 'Refeição',
      camera: '1',
    },
  } as never);
}
