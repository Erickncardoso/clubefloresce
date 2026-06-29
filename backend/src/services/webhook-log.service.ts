import fs from "fs/promises";
import path from "path";
import { normalizeUazapiWebhookEventType } from "../utils/uazapi-webhook-event.util";

const WEBHOOK_DIR = path.resolve(__dirname, "../../webhook");

const MESSAGE_EVENT_TYPES = new Set([
  "messages",
  "messages.upsert",
  "messages_update",
  "messages.update",
  "history",
]);

type LogEntry = Record<string, unknown>;

const ensureWebhookDir = async (): Promise<void> => {
  await fs.mkdir(WEBHOOK_DIR, { recursive: true });
};

const todayLogPath = (prefix: string): string => {
  const day = new Date().toISOString().slice(0, 10);
  return path.join(WEBHOOK_DIR, `${prefix}-${day}.log`);
};

const appendLine = async (filePath: string, entry: LogEntry): Promise<void> => {
  const line = `${JSON.stringify(entry)}\n`;
  await fs.appendFile(filePath, line, "utf8");
};

const pickText = (message: Record<string, unknown> | undefined): string => {
  if (!message) return "";
  const conversation = message.conversation;
  if (typeof conversation === "string" && conversation.trim()) return conversation.trim();
  const extended = message.extendedTextMessage as Record<string, unknown> | undefined;
  if (typeof extended?.text === "string" && extended.text.trim()) return extended.text.trim();
  const image = message.imageMessage as Record<string, unknown> | undefined;
  if (image) return "[imagem]";
  const audio = message.audioMessage as Record<string, unknown> | undefined;
  if (audio) return "[áudio]";
  const video = message.videoMessage as Record<string, unknown> | undefined;
  if (video) return "[vídeo]";
  const doc = message.documentMessage as Record<string, unknown> | undefined;
  if (doc) return "[documento]";
  const sticker = message.stickerMessage as Record<string, unknown> | undefined;
  if (sticker) return "[sticker]";
  const contact = message.contactMessage as Record<string, unknown> | undefined;
  if (contact) return "[contato]";
  return "";
};

const normalizeMessageRow = (row: Record<string, unknown>): LogEntry | null => {
  const key = (row.key as Record<string, unknown> | undefined) || {};
  const message = (row.message as Record<string, unknown> | undefined)
    || (row.msg as Record<string, unknown> | undefined);

  const chatJid = String(
    row.chatid
    || row.chatId
    || row.wa_chatid
    || row.remoteJid
    || key.remoteJid
    || "",
  ).trim();

  const fromMe = Boolean(row.fromMe ?? key.fromMe);
  const messageId = String(key.id || row.id || row.messageid || "").trim();
  const text = pickText(message) || String(row.body || row.text || "").trim();
  const pushName = String(row.pushName || row.notifyName || row.senderName || "").trim();

  if (!chatJid && !messageId && !text) return null;

  return {
    chatJid: chatJid || null,
    messageId: messageId || null,
    fromMe,
    pushName: pushName || null,
    text: text || null,
    timestamp: row.messageTimestamp || row.timestamp || Date.now(),
  };
};

const extractMessageRows = (payload: unknown): LogEntry[] => {
  if (!payload || typeof payload !== "object") return [];
  const body = payload as Record<string, unknown>;
  const data = body.data;
  const rows: Record<string, unknown>[] = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object") rows.push(item as Record<string, unknown>);
    }
  } else if (data && typeof data === "object") {
    rows.push(data as Record<string, unknown>);
  } else {
    rows.push(body);
  }

  const normalized: LogEntry[] = [];
  for (const row of rows) {
    const entry = normalizeMessageRow(row);
    if (entry) normalized.push(entry);
  }
  return normalized;
};

export class WebhookLogService {
  getLogDirectory(): string {
    return WEBHOOK_DIR;
  }

  async logWebhookEvent(payload: unknown): Promise<void> {
    try {
      await ensureWebhookDir();
      const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
      const eventType = normalizeUazapiWebhookEventType(payload);
      const at = new Date().toISOString();

      await appendLine(todayLogPath("events"), {
        at,
        eventType,
        payload: body,
      });

      if (MESSAGE_EVENT_TYPES.has(eventType)) {
        console.log(`[Webhook] evento ${eventType}`, JSON.stringify(body).slice(0, 280));
      }

      if (!MESSAGE_EVENT_TYPES.has(eventType)) return;

      const messages = extractMessageRows(payload);
      const incoming = messages.filter((m) => m.fromMe === false);

      for (const msg of incoming) {
        await appendLine(todayLogPath("messages"), {
          at,
          eventType,
          direction: "received",
          ...msg,
        });
      }

      if (incoming.length === 0 && messages.length > 0) {
        for (const msg of messages) {
          await appendLine(todayLogPath("messages"), {
            at,
            eventType,
            direction: msg.fromMe ? "sent" : "received",
            ...msg,
          });
        }
      }

      for (const msg of incoming.length > 0 ? incoming : messages.filter((m) => m.fromMe === false)) {
        const chat = String(msg.chatJid || "?");
        const who = String(msg.pushName || chat);
        const text = String(msg.text || "(sem texto)");
        console.log(`[Webhook] MSG recebida | ${who} | ${chat} | ${text}`);
      }
    } catch (error) {
      console.error("[WebhookLog] Falha ao gravar log em disco:", error);
    }
  }
}

const webhookLogService = new WebhookLogService();
export default webhookLogService;
