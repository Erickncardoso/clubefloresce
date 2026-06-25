import { WhatsappService } from "../services/whatsapp.service";

const whatsappService = new WhatsappService();

export async function runWhatsappMobilePresenceRefresh(): Promise<void> {
  try {
    await whatsappService.refreshMobilePresenceForAllConnectedInstances();
  } catch (error) {
    console.error("[WhatsApp] Falha ao refrescar presença para notificações no celular:", error);
  }
}

export function startWhatsappMobilePresenceScheduler() {
  void runWhatsappMobilePresenceRefresh();
  setInterval(() => {
    void runWhatsappMobilePresenceRefresh();
  }, 90_000);
}
