import { parseMealTimeToMinutes } from '@/lib/meal-plan-time';

export type MealPhotoStatus = 'done' | 'pending' | 'open';

export type MealPhotoStatusRow = {
  id: string;
  label: string;
  time?: string;
  status: MealPhotoStatus;
  hasPhoto: boolean;
};

type MealRow = { id: string; label?: string | null; time?: string };
type DiaryEntry = { mealType?: string; imageUrl?: string | null };

function entryForMeal(entries: DiaryEntry[], mealId: string) {
  return entries.find((entry) => entry.mealType === mealId);
}

function hasMealPhoto(entry?: DiaryEntry) {
  return Boolean(entry?.imageUrl);
}

export function buildMealPhotoStatuses(
  meals: MealRow[],
  entries: DiaryEntry[] = [],
  options: { isToday?: boolean; now?: Date } = {},
): MealPhotoStatusRow[] {
  if (!meals.length) return [];

  const isToday = options.isToday ?? true;
  const now = options.now ?? new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const sorted = [...meals].sort(
    (a, b) => parseMealTimeToMinutes(a.time) - parseMealTimeToMinutes(b.time),
  );

  return sorted.map((meal, index) => {
    const entry = entryForMeal(entries, meal.id);
    const hasPhoto = hasMealPhoto(entry);

    if (hasPhoto) {
      return {
        id: meal.id,
        label: meal.label || 'Refeição',
        time: meal.time,
        status: 'done',
        hasPhoto: true,
      };
    }

    if (!isToday) {
      return {
        id: meal.id,
        label: meal.label || 'Refeição',
        time: meal.time,
        status: 'pending',
        hasPhoto: false,
      };
    }

    const nextMeal = sorted[index + 1];
    const nextStart = nextMeal
      ? parseMealTimeToMinutes(nextMeal.time)
      : 24 * 60;

    const status: MealPhotoStatus = nowMinutes >= nextStart ? 'pending' : 'open';

    return {
      id: meal.id,
      label: meal.label || 'Refeição',
      time: meal.time,
      status,
      hasPhoto: false,
    };
  });
}

export function pickDefaultMealId(rows: MealPhotoStatusRow[], fallbackId?: string | null) {
  if (!rows.length) return fallbackId || '';
  const pending = rows.find((row) => row.status === 'pending');
  if (pending) return pending.id;
  const open = rows.find((row) => row.status === 'open');
  if (open) return open.id;
  return rows[rows.length - 1]?.id || fallbackId || '';
}

export function formatMealTimeLabel(time?: string) {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  if (!hours || minutes == null) return time;
  return `${hours}:${minutes}`;
}
