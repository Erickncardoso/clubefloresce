import { isWuzapiProvider, resolveFlorescerUserIdFromWuzapiToken } from "../config/whatsapp-provider.config";
import { normalizeWhatsappSessionJid } from "../services/whatsapp-session.service";
import { parseWuzapiWebhookBody } from "./wuzapi-message-ingest.util";

type JsonObject = Record<string, unknown>;

const pickJid = (value: unknown): string | null => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
};

/** Resolve userId Florescer a partir de webhook WuzAPI (campo token). */
export function resolveUserIdFromWuzapiWebhook(payload: unknown): string | null {
  if (!isWuzapiProvider() || !payload || typeof payload !== "object") return null;
  const body = payload as JsonObject;
  const token = String(body.token || body.Token || "").trim();
  if (!token) return null;
  return resolveFlorescerUserIdFromWuzapiToken(token);
}

const WUZAPI_EVENT_MAP: Record<string, string> = {
  message: "messages",
  historysync: "history",
  readreceipt: "messages.update",
  chatpresence: "presence",
  presence: "presence",
  connected: "connection",
  disconnected: "connection",
  loggedout: "connection",
  logout: "connection",
  qr: "connection",
  pairsuccess: "connection",
  appstatesynccomplete: "connection",
  calloffer: "call",
  callaccept: "call",
  callterminate: "call",
};

/** Tipo de evento WuzAPI → string normalizada (compatível com pipeline UAZAPI). */
export function normalizeWuzapiWebhookEventType(payload: unknown): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "unknown";
  const body = payload as JsonObject;
  const eventField = body.event ?? body.Event;
  const raw = String(
    body.type
    || body.Type
    || (typeof eventField === "string" ? eventField : "")
    || body.EventType
    || "Message",
  ).trim().toLowerCase();
  return WUZAPI_EVENT_MAP[raw] || raw;
}

/** Extrai JID do chat a partir de webhook WuzAPI. */
export function extractWuzapiWebhookChatJid(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const body = payload as JsonObject;

  const rootCandidates = [body.chatid, body.chatId, body.wa_chatid, body.remoteJid];
  for (const candidate of rootCandidates) {
    const value = pickJid(candidate);
    if (value) return value;
  }

  const event = body.event ?? body.Event;
  if (event && typeof event === "object" && !Array.isArray(event)) {
    const ev = event as JsonObject;
    const info = (ev.Info ?? ev.info) as JsonObject | undefined;

    const fromInfo = info
      ? pickJid(info.RemoteJid ?? info.remoteJid ?? info.RemoteJID ?? info.Chat ?? info.chat)
      : null;
    if (fromInfo) return fromInfo;

    const fromEvent = pickJid(ev.Chat ?? ev.chat ?? ev.Source ?? ev.source ?? ev.JID ?? ev.jid);
    if (fromEvent) return fromEvent;

    const data = (ev.Data ?? ev.data) as JsonObject | undefined;
    const conversations = (ev.Conversations ?? ev.conversations ?? data?.Conversations ?? data?.conversations) as unknown;
    if (Array.isArray(conversations) && conversations.length) {
      const first = conversations[0] as JsonObject;
      const convJid = pickJid(first.ID ?? first.Id ?? first.id ?? first.JID ?? first.jid);
      if (convJid) return convJid;
    }
  }

  const message = body.message;
  if (message && typeof message === "object" && !Array.isArray(message)) {
    const msg = message as JsonObject;
    const fromMessage = pickJid(msg.chatid ?? msg.chatJid ?? msg.wa_chatid);
    if (fromMessage) return fromMessage;
  }

  return null;
}

/** JID da conta em webhooks de conexão (Connected, PairSuccess, etc.). */
export function extractWuzapiSessionJidFromWebhook(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const body = payload as JsonObject;

  const type = String(body.type || body.Type || "").trim().toLowerCase();
  const connectionTypes = new Set([
    "connected",
    "pairsuccess",
    "pair_success",
    "loggedin",
    "logged_in",
  ]);

  const event = body.event ?? body.Event;
  const eventObj = event && typeof event === "object" && !Array.isArray(event)
    ? (event as JsonObject)
    : null;

  const candidates: unknown[] = [
    body.jid,
    body.JID,
    eventObj?.jid,
    eventObj?.JID,
  ];

  if (!connectionTypes.has(type)) return null;

  for (const candidate of candidates) {
    const normalized = normalizeWhatsappSessionJid(candidate);
    if (normalized && !normalized.endsWith("@g.us")) return normalized;
  }

  return null;
}

export { parseWuzapiWebhookBody };
