import { isUazapiProvider, isWuzapiProvider } from "../config/whatsapp-provider.config";
import type { WhatsappService } from "./whatsapp.service";
import { getPusherClient, isPusherConfigured, whatsappPusherChannel } from "../utils/pusher-config";
import {
  extractUazapiWebhookChatJid,
  normalizeUazapiWebhookEventType,
  parseUazapiChatDeletion,
  parseUazapiGroupMembershipChange,
} from "../utils/uazapi-webhook-event.util";
import {
  extractWuzapiWebhookChatJid,
  normalizeWuzapiWebhookEventType,
  resolveUserIdFromWuzapiWebhook,
} from "../utils/wuzapi-webhook.util";
import { extractUazapiMessagesFromPayload } from "../utils/uazapi-message-ingest.util";
import {
  adaptWuzapiWebhookForIngest,
  extractWuzapiMessagesFromPayload,
} from "../utils/wuzapi-message-ingest.util";

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

const whatsappServiceLazy = (): WhatsappService => {
  // Lazy init evita ciclo wuzapi-whatsapp → pusher → whatsapp.service → wuzapi-whatsapp
  const { WhatsappService: Facade } = require("./whatsapp.service") as typeof import("./whatsapp.service");
  return new Facade();
};

export class WhatsappPusherService {
  normalizeEventType(payload: unknown): string {
    if (isWuzapiProvider()) return normalizeWuzapiWebhookEventType(payload);
    return normalizeUazapiWebhookEventType(payload);
  }

  shouldTriggerSync(eventType: string): boolean {
    if (SYNC_EVENT_TYPES.has(eventType)) return true;
    const root = eventType.split(".")[0];
    return SYNC_EVENT_TYPES.has(root);
  }

  extractChatJid(payload: unknown): string | null {
    if (isWuzapiProvider()) {
      return extractWuzapiWebhookChatJid(payload) || extractUazapiWebhookChatJid(payload);
    }
    return extractUazapiWebhookChatJid(payload);
  }

  async resolveUserIdFromWebhook(payload: unknown): Promise<string | null> {
    if (!payload || typeof payload !== "object") return null;

    if (!isUazapiProvider()) {
      const wuzUserId = resolveUserIdFromWuzapiWebhook(payload);
      if (wuzUserId) return wuzUserId;
    }

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
      return whatsappServiceLazy().resolveUserIdByInstanceRef(instanceRef);
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
    const deletedChatJid = parseUazapiChatDeletion(payload);
    const groupChange = parseUazapiGroupMembershipChange(payload);

    const body = payload as Record<string, unknown>;
    const chat = body.chat && typeof body.chat === "object" ? body.chat : undefined;
    let extractedMessages = isWuzapiProvider()
      ? extractWuzapiMessagesFromPayload(payload)
      : extractUazapiMessagesFromPayload(payload);
    if (!extractedMessages.length && isWuzapiProvider()) {
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
        chatDeleted: Boolean(deletedChatJid),
        deletedChatJid: deletedChatJid || null,
        groupChange,
        chat,
        message,
        messages: extractedMessages,
        event: eventPayload,
        data: dataPayload,
        at: Date.now(),
      });
      const groupHint = groupChange
        ? `, ${groupChange.action}@${groupChange.groupJid}`
        : (chatJid ? `, ${chatJid}` : "");
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
