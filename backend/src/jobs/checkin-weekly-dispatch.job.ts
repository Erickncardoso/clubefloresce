import { CheckInDispatchService } from "../services/checkin-dispatch.service";
import { getCheckInWindowParts } from "../utils/checkin-weekly-window";

const dispatchService = new CheckInDispatchService();
let lastRunKey = "";

/** Sexta 11:00 (horário de Brasília) — dispara check-in para todas as pacientes. */
export async function runCheckInDispatchIfDue(): Promise<void> {
  const parts = getCheckInWindowParts();
  const runKey = `${parts.year}-${parts.month}-${parts.day}-${parts.hour}`;

  if (parts.weekday !== 5 || parts.hour !== 11 || parts.minute > 5) return;
  if (lastRunKey === runKey) return;

  try {
    const result = await dispatchService.dispatchWeeklyToAllPatients();
    if (!result.skipped) {
      console.log(`[CheckIn] Disparo semanal: ${result.message}`);
    }
    lastRunKey = runKey;
  } catch (error) {
    console.error("[CheckIn] Falha no disparo automático:", error);
  }
}

export function startCheckInDispatchScheduler() {
  void runCheckInDispatchIfDue();
  setInterval(() => {
    void runCheckInDispatchIfDue();
    void dispatchService.processScheduledDispatches().catch((error) => {
      console.error("[CheckIn] Falha no disparo programado:", error);
    });
  }, 60_000);
}
