import { BillingNotificationService } from "../services/billing-notification.service";
import { formatDateKeyInTimeZone } from "../utils/billing-renewal-dates";

const service = new BillingNotificationService();
let lastRenewalDayKey = "";

export async function runBillingNotificationJobs(now = new Date()): Promise<void> {
  try {
    await service.processCartAbandonmentReminders(now);
  } catch (error) {
    console.error("[BillingNotify] Falha em carrinho abandonado:", error);
  }

  // Uma vez por dia civil (BRT) — evita reenviar lembretes a cada hora.
  const renewalKey = formatDateKeyInTimeZone(now);
  if (lastRenewalDayKey !== renewalKey) {
    lastRenewalDayKey = renewalKey;
    try {
      await service.processRenewalReminders(now);
    } catch (error) {
      console.error("[BillingNotify] Falha em lembrete de renovação:", error);
      lastRenewalDayKey = "";
    }
  }
}

export function startBillingNotificationScheduler() {
  void runBillingNotificationJobs();
  setInterval(() => {
    void runBillingNotificationJobs();
  }, 60_000);
}
