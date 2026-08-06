import { EvolutionReminderDispatchService } from "../services/evolution-reminder-dispatch.service";

const dispatchService = new EvolutionReminderDispatchService();
let lastRunMinuteKey = "";

export async function runEvolutionReminderDispatchIfDue(now = new Date()): Promise<void> {
  const minuteKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}-${now.getUTCMinutes()}`;
  if (lastRunMinuteKey === minuteKey) return;
  lastRunMinuteKey = minuteKey;

  try {
    await dispatchService.dispatchDueReminders(now);
  } catch (error) {
    console.error("[EvolutionReminder] Falha no disparo automático:", error);
    lastRunMinuteKey = "";
  }
}

export function startEvolutionReminderDispatchScheduler() {
  void runEvolutionReminderDispatchIfDue();
  setInterval(() => {
    void runEvolutionReminderDispatchIfDue();
  }, 60_000);
}
