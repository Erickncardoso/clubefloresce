import { MealReminderDispatchService } from "../services/meal-reminder-dispatch.service";

const dispatchService = new MealReminderDispatchService();
let lastRunMinuteKey = "";

export async function runMealReminderDispatchIfDue(now = new Date()): Promise<void> {
  const minuteKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}-${now.getUTCMinutes()}`;
  if (lastRunMinuteKey === minuteKey) return;

  lastRunMinuteKey = minuteKey;

  try {
    await dispatchService.dispatchDueReminders(now);
  } catch (error) {
    console.error("[MealReminder] Falha no disparo automático:", error);
    lastRunMinuteKey = "";
  }
}

export function startMealReminderDispatchScheduler() {
  void runMealReminderDispatchIfDue();
  setInterval(() => {
    void runMealReminderDispatchIfDue();
  }, 60_000);
}
