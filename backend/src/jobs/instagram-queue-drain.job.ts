import { drainInstagramQueue } from "../services/instagram-queue.service";

/** Drena a fila a cada 60s + no boot. O webhook também chama drain em fire-and-forget. */
export function startInstagramQueueDrainScheduler(): void {
  void drainInstagramQueue().catch((error) => {
    console.error("[Instagram] Falha no drain inicial da fila:", error);
  });
  setInterval(() => {
    void drainInstagramQueue().catch((error) => {
      console.error("[Instagram] Falha no drain da fila:", error);
    });
  }, 60_000);
}
