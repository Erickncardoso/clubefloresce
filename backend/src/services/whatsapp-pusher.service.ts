import { WhatsappService } from "./whatsapp.service";
import { getPusherClient, isPusherConfigured, whatsappPusherChannel } from "../utils/pusher-config";

const SYNC_EVENT_TYPES = new Set([
  "messages",
  "messages.upsert",
  "messages_update",
  "messages.update",
  "chats",
  "chats.upsert",
  "chats.update",
  "chat",
  "chat.update",
  "connection",
  "groups",
  "presence",
  "contacts",
]);

const whatsappService = new WhatsappService();

export class WhatsappPusherService {
  normalizeEventType(payload: unknown): string {
    if (!payload || typeof payload !== "object") return "unknown";
    const body = payload as Record<string, unknown>;
    return String(body.event || body.type || "unknown").trim().toLowerCase();
  }

  shouldTriggerSync(eventType: string): boolean {
    if (SYNC_EVENT_TYPES.has(eventType)) return true;
    const root = eventType.split(".")[0];
    return SYNC_EVENT_TYPES.has(root);
  }

  extractChatJid(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") return null;
    const body = payload as Record<string, unknown>;
    const data = body.data;

    const pick = (value: unknown): string | null => {
      const text = typeof value === "string" ? value.trim() : "";
      return text || null;
    };

    const rootCandidates = [
      body.chatid,
      body.chatId,
      body.wa_chatid,
      body.remoteJid,
    ];
    for (const candidate of rootCandidates) {
      const value = pick(candidate);
      if (value) return value;
    }

    const nestedCandidates: unknown[] = [];

    if (data && typeof data === "object" && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      nestedCandidates.push(
        obj.chatid,
        obj.chatId,
        obj.wa_chatid,
        obj.remoteJid,
        obj.from,
        (obj.key as Record<string, unknown> | undefined)?.remoteJid,
        (obj.message as Record<string, unknown> | undefined)?.key,
      );
      const messageKey = (obj.message as Record<string, unknown> | undefined)?.key;
      if (messageKey && typeof messageKey === "object") {
        nestedCandidates.push((messageKey as Record<string, unknown>).remoteJid);
      }
    }

    if (Array.isArray(data)) {
      for (const item of data) {
        if (!item || typeof item !== "object") continue;
        const row = item as Record<string, unknown>;
        nestedCandidates.push(
          row.chatid,
          row.chatId,
          row.wa_chatid,
          row.remoteJid,
          (row.key as Record<string, unknown> | undefined)?.remoteJid,
        );
      }
    }

    for (const candidate of nestedCandidates) {
      const value = pick(candidate);
      if (value) return value;
    }

    return null;
  }

  async resolveUserIdFromWebhook(payload: unknown): Promise<string | null> {
    if (!payload || typeof payload !== "object") return null;
    const body = payload as Record<string, unknown>;

    const directAdmin = String(
      body.adminField01
      || (body.instance as Record<string, unknown> | undefined)?.adminField01
      || (body.data as Record<string, unknown> | undefined)?.adminField01
      || "",
    ).trim();
    if (directAdmin) return directAdmin;

    const instanceName = String(
      body.instanceName
      || (body.instance as Record<string, unknown> | undefined)?.name
      || (body.instance as Record<string, unknown> | undefined)?.instanceName
      || "",
    ).trim();
    const nameMatch = /^instancia_(.+)$/.exec(instanceName);
    if (nameMatch?.[1]) return nameMatch[1];

    const instanceRef = String(
      typeof body.instance === "string"
        ? body.instance
        : (body.instance as Record<string, unknown> | undefined)?.id
          || body.instanceId
          || (body.data as Record<string, unknown> | undefined)?.instanceId
          || "",
    ).trim();

    if (instanceRef) {
      return whatsappService.resolveUserIdByInstanceRef(instanceRef);
    }

    return null;
  }

  async handleWebhook(payload: unknown): Promise<void> {
    if (!isPusherConfigured()) return;

    const eventType = this.normalizeEventType(payload);
    if (!this.shouldTriggerSync(eventType)) return;

    const userId = await this.resolveUserIdFromWebhook(payload);
    if (!userId) {
      console.warn(`[Pusher] Webhook sem userId resolvível (${eventType}).`);
      return;
    }

    const pusher = getPusherClient();
    if (!pusher) return;

    const chatJid = this.extractChatJid(payload);

    try {
      await pusher.trigger(whatsappPusherChannel(userId), "whatsapp-sync", {
        eventType,
        chatJid,
        at: Date.now(),
      });
      console.log(`[Pusher] whatsapp-sync → ${userId.slice(0, 8)}… (${eventType}${chatJid ? `, ${chatJid}` : ""})`);
    } catch (error) {
      console.error("[Pusher] Falha ao disparar whatsapp-sync:", error);
    }
  }
}

const whatsappPusherService = new WhatsappPusherService();
export default whatsappPusherService;
