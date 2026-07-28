import { getPusherClient, isPusherConfigured, whatsappPusherChannel } from "../utils/pusher-config";
import {
  extractWuzapiWebhookChatJid,
  normalizeWuzapiWebhookEventType,
  resolveUserIdFromWuzapiWebhook,
} from "../utils/wuzapi-webhook.util";
import {
  adaptWuzapiWebhookForIngest,
  extractWuzapiMessagesFromPayload,
} from "../utils/wuzapi-message-ingest.util";
import { extractUazapiMessagesFromPayload } from "../utils/uazapi-message-ingest.util";

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
  "history",
  "groups",
  "group",
  "presence",
  "contacts",
]);

export class WhatsappPusherService {
  normalizeEventType(payload: unknown): string {
    return normalizeWuzapiWebhookEventType(payload);
  }

  shouldTriggerSync(eventType: string): boolean {
    if (SYNC_EVENT_TYPES.has(eventType)) return true;
    const root = eventType.split(".")[0];
    return SYNC_EVENT_TYPES.has(root);
  }

  extractChatJid(payload: unknown): string | null {
    return extractWuzapiWebhookChatJid(payload);
  }

  async resolveUserIdFromWebhook(payload: unknown): Promise<string | null> {
    if (!payload || typeof payload !== "object") return null;

    const wuzUserId = resolveUserIdFromWuzapiWebhook(payload);
    if (wuzUserId) return wuzUserId;

    const wuzFallback = String(process.env.WUZAPI_DEFAULT_USER_ID || "").trim();
    return wuzFallback || null;
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
    const body = payload as Record<string, unknown>;
    const chat = body.chat && typeof body.chat === "object" ? body.chat : undefined;
    let extractedMessages = extractWuzapiMessagesFromPayload(payload);
    if (!extractedMessages.length) {
      extractedMessages = extractUazapiMessagesFromPayload(adaptWuzapiWebhookForIngest(payload));
    }
    const message = body.message && typeof body.message === "object"
      ? body.message
      : extractedMessages[0];
    const eventPayload = body.event && typeof body.event === "object" && !Array.isArray(body.event) ? body.event : undefined;
    const dataPayload = body.data && typeof body.data === "object" ? body.data : undefined;

    try {
      await pusher.trigger(whatsappPusherChannel(userId), "whatsapp-sync", {
        eventType,
        chatJid,
        chatDeleted: false,
        deletedChatJid: null,
        groupChange: null,
        chat,
        message,
        messages: extractedMessages,
        event: eventPayload,
        data: dataPayload,
        at: Date.now(),
      });
      const groupHint = chatJid ? `, ${chatJid}` : "";
      console.log(`[Pusher] whatsapp-sync → ${userId.slice(0, 8)}… (${eventType}${groupHint})`);
    } catch (error) {
      console.error("[Pusher] Falha ao disparar whatsapp-sync:", error);
    }
  }

  async notifySessionReset(userId: string, reason = "session-change"): Promise<void> {
    if (!isPusherConfigured()) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    try {
      await pusher.trigger(whatsappPusherChannel(userId), "whatsapp-sync", {
        eventType: "session.reset",
        sessionReset: true,
        reason,
        at: Date.now(),
      });
      console.log(`[Pusher] whatsapp session reset → ${userId.slice(0, 8)}… (${reason})`);
    } catch (error) {
      console.error("[Pusher] Falha ao disparar session reset:", error);
    }
  }
}

const whatsappPusherService = new WhatsappPusherService();
export default whatsappPusherService;
