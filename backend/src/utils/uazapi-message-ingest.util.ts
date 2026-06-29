type JsonObject = Record<string, unknown>;

const pickText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  return "";
};

const pushMessageFindChatId = (out: Set<string>, value: unknown): void => {
  const raw = pickText(value);
  if (!raw) return;

  const lower = raw.toLowerCase();
  if (
    lower.endsWith("@s.whatsapp.net")
    || lower.endsWith("@g.us")
    || lower.endsWith("@lid")
  ) {
    out.add(lower);
    return;
  }

  if (raw.includes(":") && !raw.includes("@")) {
    const segments = raw.split(":");
    const peer = segments.slice(1).join(":").trim() || segments.pop() || "";
    if (peer) pushMessageFindChatId(out, peer);
    const peerDigits = peer.replace(/\D/g, "");
    if (peerDigits.length >= 8) out.add(`${peerDigits}@s.whatsapp.net`);
    return;
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 8) out.add(`${digits}@s.whatsapp.net`);
};

/** Todos os chatids válidos para POST /message/find a partir de chat, mensagem ou JID. */
export function collectMessageFindChatIds(source: unknown, extraFallback = ""): string[] {
  const out = new Set<string>();

  if (typeof source === "string") {
    pushMessageFindChatId(out, source);
    pushMessageFindChatId(out, extraFallback);
    return Array.from(out);
  }

  if (!source || typeof source !== "object") {
    pushMessageFindChatId(out, extraFallback);
    return Array.from(out);
  }

  const row = source as JsonObject;
  const rawPayload = row.raw && typeof row.raw === "object" && !Array.isArray(row.raw)
    ? (row.raw as JsonObject)
    : null;

  const values = [
    row.wa_chatid,
    row.chatJid,
    row.chatid,
    row.chatId,
    row.id,
    row.wa_chatlid,
    row.chatlid,
    row.chatLid,
    row.wa_fastid,
    row.fastid,
    row.phone,
    row.lead_phone,
    row.sender_pn,
    row.senderPn,
    row.SenderPn,
    row.sender_lid,
    row.senderLid,
    row.lastMessageSender,
    row.wa_lastMessageSender,
    row.wa_lastMsgSender,
    row.Chat,
    row.chat,
    rawPayload?.wa_chatid,
    rawPayload?.chatJid,
    rawPayload?.chatid,
    rawPayload?.wa_chatlid,
    rawPayload?.chatlid,
    rawPayload?.wa_fastid,
    rawPayload?.phone,
    rawPayload?.sender_pn,
    extraFallback,
  ];

  for (const value of values) pushMessageFindChatId(out, value);

  const key = (row.key as JsonObject | undefined) || {};
  pushMessageFindChatId(out, key.remoteJid);
  pushMessageFindChatId(out, key.RemoteJID);

  return Array.from(out);
}

export const normalizeUazapiMessageId = (msg: JsonObject): string => {
  const key = (msg.key as JsonObject | undefined) || {};
  const candidates = [
    msg.id,
    msg.messageid,
    msg.messageId,
    key.id,
    key.ID,
  ];
  for (const candidate of candidates) {
    const text = pickText(candidate);
    if (text) return text;
  }
  return "";
};

export const normalizeUazapiChatJid = (msg: JsonObject, fallback = ""): string => {
  const key = (msg.key as JsonObject | undefined) || {};
  const candidates = [
    msg.chatid,
    msg.chatId,
    msg.chatJid,
    msg.wa_chatid,
    msg.Chat,
    msg.ChatID,
    key.remoteJid,
    key.RemoteJID,
    fallback,
  ];
  for (const candidate of candidates) {
    const text = pickText(candidate).toLowerCase();
    if (!text) continue;
    if (text.endsWith("@g.us") || text.endsWith("@s.whatsapp.net") || text.endsWith("@lid")) {
      return text;
    }
  }

  const senderPn = pickText(msg.sender_pn || msg.senderPn || msg.SenderPn).toLowerCase();
  if (senderPn.endsWith("@s.whatsapp.net")) return senderPn;

  const chatLid = pickText(msg.chatlid || msg.chatLid || msg.wa_chatlid).toLowerCase();
  if (chatLid.endsWith("@lid")) return chatLid;

  return "";
};

export const normalizeUazapiMessageTimestamp = (msg: JsonObject): bigint => {
  const raw = msg.messageTimestamp ?? msg.timestamp ?? msg.t ?? Date.now();
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return BigInt(Date.now());
  return BigInt(num < 1_000_000_000_000 ? Math.floor(num * 1000) : Math.floor(num));
};

const pushMessageRow = (rows: JsonObject[], msg: unknown): void => {
  if (!msg || typeof msg !== "object" || Array.isArray(msg)) return;
  rows.push(msg as JsonObject);
};

/** Extrai mensagens de payloads UAZAPI (webhook, SSE, message/find). */
export function extractUazapiMessagesFromPayload(payload: unknown): JsonObject[] {
  if (!payload || typeof payload !== "object") return [];
  const body = payload as JsonObject;
  const rows: JsonObject[] = [];

  pushMessageRow(rows, body.message);

  const data = body.data;
  if (Array.isArray(data)) {
    for (const item of data) pushMessageRow(rows, item);
  } else if (data && typeof data === "object") {
    const dataObj = data as JsonObject;
    if (Array.isArray(dataObj.messages)) {
      for (const item of dataObj.messages) pushMessageRow(rows, item);
    }
    pushMessageRow(rows, dataObj.message);
    pushMessageRow(rows, dataObj);
  }

  const event = body.event;
  if (event && typeof event === "object" && !Array.isArray(event)) {
    const eventObj = event as JsonObject;
    if (Array.isArray(eventObj.messages)) {
      for (const item of eventObj.messages) pushMessageRow(rows, item);
    }
  }

  if (Array.isArray(body.messages)) {
    for (const item of body.messages) pushMessageRow(rows, item);
  }

  return rows.filter((row) => normalizeUazapiMessageId(row) || normalizeUazapiChatJid(row));
}

/** IDs em webhooks messages_update (sem corpo da mensagem). */
export function extractMessageUpdateRefs(
  payload: unknown,
): Array<{ chatJid: string; messageIds: string[] }> {
  if (!payload || typeof payload !== "object") return [];
  const body = payload as JsonObject;
  const event = (body.event || body.Event) as JsonObject | undefined;
  if (!event || typeof event !== "object" || Array.isArray(event)) return [];

  const chatJid = pickText(
    event.Chat ||
    event.chat ||
    event.ChatJID ||
    event.chatid ||
    event.chatJid ||
    "",
  );
  const rawIds = event.MessageIDs || event.messageIDs || event.MessageIds || event.messageids;
  if (!chatJid || !Array.isArray(rawIds) || rawIds.length === 0) return [];

  const messageIds = rawIds
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return messageIds.length ? [{ chatJid, messageIds }] : [];
}

export const resolveMessageFindChatId = (chatJid: string): string => {
  const normalized = String(chatJid || "").trim().toLowerCase();
  if (!normalized) return "";
  if (
    normalized.endsWith("@s.whatsapp.net")
    || normalized.endsWith("@g.us")
    || normalized.endsWith("@lid")
  ) {
    return normalized;
  }
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 8 ? `${digits}@s.whatsapp.net` : normalized;
};
