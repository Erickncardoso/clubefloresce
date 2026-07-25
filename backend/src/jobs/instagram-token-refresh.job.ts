import { InstagramOauthService } from "../services/instagram-oauth.service";

const oauthService = new InstagramOauthService();
let lastRunDay = "";

/** Uma vez por dia: renova tokens de longa duração que expiram em menos de 10 dias. */
export function startInstagramTokenRefreshScheduler(): void {
  const run = async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (lastRunDay === today) return;
    lastRunDay = today;
    await oauthService.refreshExpiringTokens();
  };

  void run().catch((error) => {
    console.error("[Instagram] Falha na checagem inicial de tokens:", error);
  });
  setInterval(() => {
    void run().catch((error) => {
      console.error("[Instagram] Falha na renovação de tokens:", error);
    });
  }, 60 * 60_000);
}
