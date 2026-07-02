import { BillingNotificationService } from "../services/billing-notification.service";

const service = new BillingNotificationService();
let lastRenewalDayKey = "";

export async function runBillingNotificationJobs(now = new Date()): Promise<void> {
  try {
    await service.processCartAbandonmentReminders(now);
  } catch (error) {
    console.error("[BillingNotify] Falha em carrinho abandonado:", error);
  }

  const renewalKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`;
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
