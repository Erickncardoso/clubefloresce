import { AdminPushService } from "../services/admin-push.service";

const adminPush = new AdminPushService();

export function startAdminPushDispatchScheduler() {
  void adminPush.processDueCampaigns().catch((error) => {
    console.error("[AdminPush] Falha no disparo programado:", error);
  });

  setInterval(() => {
    void adminPush.processDueCampaigns().catch((error) => {
      console.error("[AdminPush] Falha no disparo programado:", error);
    });
  }, 60_000);
}
