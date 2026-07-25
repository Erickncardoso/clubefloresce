import { isUazapiProvider } from "../config/whatsapp-provider.config";
import { WhatsappService } from "../services/whatsapp.service";

const whatsappService = new WhatsappService();

export async function runWhatsappMobilePresenceRefresh(): Promise<void> {
  if (!isUazapiProvider()) return;
  try {
    await whatsappService.refreshMobilePresenceForAllConnectedInstances();
  } catch (error) {
    console.error("[WhatsApp] Falha ao refrescar presença para notificações no celular:", error);
  }
}

export function startWhatsappMobilePresenceScheduler() {
  if (!isUazapiProvider()) return;
  void runWhatsappMobilePresenceRefresh();
  setInterval(() => {
    void runWhatsappMobilePresenceRefresh();
  }, 90_000);
}
