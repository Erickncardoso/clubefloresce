import type { MealPlanFoodItem } from '@/lib/meal-plan-api';

const MAX_PUSH_ITEMS = 3;

function itemLine(item: MealPlanFoodItem): string {
  return String(item.display || item.name || '').trim();
}

export function buildMealReminderPushContent(items: MealPlanFoodItem[] = []) {
  const lines = items.map(itemLine).filter(Boolean);

  if (!lines.length) {
    const fallback = 'Hora de registrar sua refeição no diário.';
    return { body: fallback, subtitle: null as string | null, fullBody: fallback };
  }

  const fullBody = lines.join(' · ');
  const shown = lines.slice(0, MAX_PUSH_ITEMS);
  const hidden = lines.slice(MAX_PUSH_ITEMS);
  let body = shown.join(' · ');
  let subtitle: string | null = null;

  if (hidden.length > 0) {
    body += ` · +${hidden.length} ${hidden.length === 1 ? 'item' : 'itens'}`;
    subtitle = hidden.join('\n');
  }

  return { body, subtitle, fullBody };
}
