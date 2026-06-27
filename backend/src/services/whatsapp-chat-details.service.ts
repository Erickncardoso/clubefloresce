import { WhatsappService } from "./whatsapp.service";
import { WhatsappChatRepository } from "../repositories/whatsapp_chat.repository";
import { WhatsappContactStateRepository } from "../repositories/whatsapp_contact_state.repository";
import { normalizeContactJid, normalizeUazapiChatDetails } from "../utils/uazapi-chat-details.util";

const whatsappService = new WhatsappService();
const whatsappChatRepository = new WhatsappChatRepository();
const whatsappContactStateRepository = new WhatsappContactStateRepository();

export class WhatsappChatDetailsService {
  async fetchAndPersist(userId: string, number: string, preview = false) {
    const normalizedNumber = String(number || "").trim();
    if (!normalizedNumber) {
      throw new Error("Informe o número ou JID do contato.");
    }

    const payload = await whatsappService.getChatDetails(userId, {
      number: normalizedNumber,
      preview: Boolean(preview)
    });

    const details = normalizeUazapiChatDetails(payload);
    if (!details) {
      throw new Error("UAZAPI não retornou detalhes válidos do contato.");
    }

    const contactJid = normalizeContactJid(details.chatJid);

    await whatsappContactStateRepository.upsertDetails(userId, {
      contactJid,
      isSaved: details.isSaved,
      isBusiness: Boolean((payload as any)?.wa_isBusiness || (payload as any)?.isBusiness),
      phone: details.phone || undefined,
      displayName: details.displayName || undefined,
      avatarUrl: details.avatarUrl || details.avatarPreviewUrl || undefined,
      details,
      detailsSyncedAt: new Date()
    });

    if (!details.isGroup) {
      await whatsappChatRepository.upsertFromDetails(userId, {
        chatJid: contactJid,
        name: details.displayName || undefined,
        pushName: details.waName || undefined,
        avatarUrl: details.avatarUrl || details.avatarPreviewUrl || undefined,
        isGroup: false,
        raw: details.raw
      });
    } else {
      await whatsappChatRepository.upsertFromDetails(userId, {
        chatJid: contactJid,
        name: details.displayName || undefined,
        pushName: details.waName || undefined,
        avatarUrl: details.avatarUrl || details.avatarPreviewUrl || undefined,
        isGroup: true,
        raw: details.raw
      });
    }

    return details;
  }

  async getCached(userId: string, contactJid: string) {
    const normalized = normalizeContactJid(contactJid);
    if (!normalized) return null;
    const row = await whatsappContactStateRepository.findByUserAndJid(userId, normalized);
    if (!row?.details || typeof row.details !== "object") return null;
    return row.details;
  }
}
