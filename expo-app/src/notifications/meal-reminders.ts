import { buildMealReminderPushContent } from '@/lib/meal-reminder-copy';
import { activeMeals, mealSlotDisplayLabel, normalizeMealSlotKey } from '@/lib/meal-plan-options';
import type { MealPlanApiResponse } from '@/lib/meal-plan-api';
import { normalizeMealPlanResponse } from '@/lib/meal-plan-api';
import { cancelLogicalKeys, scheduleDailyNotification } from '@/notifications/scheduler';
import { loadRegistry } from '@/notifications/registry';
import type { NotificationLogicalKey } from '@/notifications/types';

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

function parseClock(time?: string | null): { hour: number; minute: number } | null {
  const match = String(time || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export async function cancelMealReminders() {
  const keys = (await loadRegistry())
    .filter((entry) => String(entry.logicalKey).startsWith('meal:'))
    .map((entry) => entry.logicalKey);
  if (keys.length) await cancelLogicalKeys(keys);
}

export async function syncMealReminders(request: RequestFn, enabled: boolean) {
  if (!enabled) {
    await cancelMealReminders();
    return;
  }

  try {
    const data = await request<MealPlanApiResponse>('/meal-plan/me');
    const { record } = normalizeMealPlanResponse(data);
    const meals = activeMeals(record?.plan?.meals || [], record?.plan?.selectedMealBySlot);
    const seen = new Set<string>();

    for (const meal of meals) {
      const clock = parseClock(meal.time);
      if (!clock) continue;
      const slotKey = normalizeMealSlotKey(meal.label);
      if (seen.has(slotKey)) continue;
      seen.add(slotKey);

      const pushContent = buildMealReminderPushContent(meal.items);
      const logicalKey = `meal:${slotKey}` as NotificationLogicalKey;
      await scheduleDailyNotification({
        logicalKey,
        title: mealSlotDisplayLabel(meal.label),
        body: pushContent.body,
        subtitle: pushContent.subtitle,
        route: `/dieta?meal=${encodeURIComponent(meal.id)}`,
        channelId: 'reminders',
        hour: clock.hour,
        minute: clock.minute,
        ignoreQuietHours: true,
        ignoreDailyCap: true,
      });
    }

    const stale = (await loadRegistry())
      .filter((entry) => {
        const key = String(entry.logicalKey);
        if (!key.startsWith('meal:')) return false;
        return !seen.has(key.slice(5));
      })
      .map((entry) => entry.logicalKey);
    if (stale.length) await cancelLogicalKeys(stale);
  } catch {
    /* plano indisponível — mantém o que já está agendado */
  }
}
