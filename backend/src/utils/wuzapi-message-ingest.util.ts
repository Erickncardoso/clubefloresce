type JsonObject = Record<string, unknown>;

const pickText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  return "";
};

const pickJid = (value: unknown): string => {
  const text = pickText(value);
  return text ? text.toLowerCase() : "";
};

/** Parse body JSON ou form-urlencoded (campo jsonData) da WuzAPI. */
export function parseWuzapiWebhookBody(body: unknown): JsonObject | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const raw = body as JsonObject;

  const jsonData = raw.jsonData ?? raw.jsondata ?? raw.JsonData;
  if (typeof jsonData === "string" && jsonData.trim()) {
    try {
      const parsed = JSON.parse(jsonData) as JsonObject;
      const token = pickText(raw.token || raw.Token || parsed.token || parsed.Token);
      return token ? { ...parsed, token } : parsed;
    } catch {
      console.warn("[WuzAPI Webhook] jsonData inválido — ignorando payload.");
      return null;
    }
  }

  return raw;
}

const readInfoBlock = (event: JsonObject): JsonObject => {
  const info = event.Info ?? event.info;
  return info && typeof info === "object" && !Array.isArray(info) ? (info as JsonObject) : {};
};

const readMessageBlock = (event: JsonObject): JsonObject => {
  const message = event.Message ?? event.message;
  return message && typeof message === "object" && !Array.isArray(message) ? (message as JsonObject) : {};
};

const resolveChatJidFromInfo = (info: JsonObject, fallback = ""): string => {
  const candidates = [
    info.RemoteJid,
    info.remoteJid,
    info.RemoteJID,
    info.Chat,
    info.chat,
    info.ChatJID,
    info.Source,
    info.source,
    fallback,
  ];
  for (const candidate of candidates) {
    const jid = pickJid(candidate);
    if (jid) return jid;
  }
  return "";
};

const resolveMessageIdFromInfo = (info: JsonObject): string => {
  return pickText(info.ID ?? info.Id ?? info.id);
};

const resolveTimestampFromInfo = (info: JsonObject, fallback?: unknown): unknown => {
  return info.Timestamp ?? info.timestamp ?? info.MessageTimestamp ?? fallback;
};

/** Converte evento whatsmeow (Info + Message) para linha compatível com ingest UAZAPI. */
export function wuzapiWhatsappEventToUazRow(
  event: JsonObject,
  fallbackChatJid = "",
): JsonObject | null {
  if (!event || typeof event !== "object") return null;

  const info = readInfoBlock(event);
  const messageBody = readMessageBlock(event);

  let chatJid = resolveChatJidFromInfo(info, fallbackChatJid);
  let messageId = resolveMessageIdFromInfo(info);
  let fromMe = Boolean(info.IsFromMe ?? info.isFromMe ?? info.FromMe ?? info.fromMe);
  let timestamp = resolveTimestampFromInfo(info);

  // HistorySync usa Key aninhado em Message.
  const key = (event.Key ?? event.key ?? messageBody.Key ?? messageBody.key) as JsonObject | undefined;
  if (key && typeof key === "object") {
    if (!messageId) messageId = pickText(key.ID ?? key.Id ?? key.id);
    if (!chatJid) {
      chatJid = pickJid(key.RemoteJID ?? key.RemoteJid ?? key.remoteJid ?? key.Chat ?? key.chat);
    }
    if (info.IsFromMe === undefined && info.isFromMe === undefined) {
      fromMe = Boolean(key.FromMe ?? key.fromMe);
    }
    if (!timestamp) timestamp = messageBody.MessageTimestamp ?? messageBody.messageTimestamp;
  }

  if (!messageId || !chatJid) return null;

  return {
    id: messageId,
    messageid: messageId,
    chatid: chatJid,
    wa_chatid: chatJid,
    fromMe,
    messageTimestamp: timestamp ?? Date.now(),
    key: {
      remoteJid: chatJid,
      id: messageId,
      fromMe,
      participant: pickText(key?.Participant ?? key?.participant ?? info.Participant ?? info.participant),
    },
    Message: messageBody,
    Info: info,
    sender_pn: pickText(info.Sender ?? info.sender ?? info.Participant ?? info.participant),
    raw: event,
  };
}

const pushHistoryConversationMessages = (
  rows: JsonObject[],
  conversations: unknown,
): void => {
  if (!Array.isArray(conversations)) return;

  for (const conv of conversations) {
    if (!conv || typeof conv !== "object" || Array.isArray(conv)) continue;
    const convObj = conv as JsonObject;
    const convId = pickJid(convObj.ID ?? convObj.Id ?? convObj.id ?? convObj.JID ?? convObj.jid);

    const messages = convObj.Messages ?? convObj.messages;
    if (!Array.isArray(messages)) continue;

    for (const item of messages) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const msgObj = item as JsonObject;
      const inner = (msgObj.Message ?? msgObj.message ?? msgObj) as JsonObject;
      const row = wuzapiWhatsappEventToUazRow(inner, convId);
      if (row) rows.push(row);
    }
  }
};

/** Extrai mensagens de webhooks WuzAPI (Message, HistorySync). */
export function extractWuzapiMessagesFromPayload(payload: unknown): JsonObject[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const body = payload as JsonObject;
  const rows: JsonObject[] = [];

  const event = body.event ?? body.Event;
  if (event && typeof event === "object" && !Array.isArray(event)) {
    const eventObj = event as JsonObject;
    const type = pickText(body.type || body.Type).toLowerCase();

    if (type === "message" || type === "") {
      const row = wuzapiWhatsappEventToUazRow(eventObj);
      if (row) rows.push(row);
    }

    const data = (eventObj.Data ?? eventObj.data) as JsonObject | undefined;
    pushHistoryConversationMessages(rows, eventObj.Conversations ?? eventObj.conversations);
    if (data && typeof data === "object") {
      pushHistoryConversationMessages(rows, data.Conversations ?? data.conversations);
    }

    if (Array.isArray(eventObj.messages)) {
      for (const item of eventObj.messages) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const row = wuzapiWhatsappEventToUazRow(item as JsonObject);
          if (row) rows.push(row);
        }
      }
    }
  }

  if (Array.isArray(body.messages)) {
    for (const item of body.messages) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const row = wuzapiWhatsappEventToUazRow(item as JsonObject);
        if (row) rows.push(row);
      }
    }
  }

  const seen = new Set<string>();
  return rows.filter((row) => {
    const id = pickText(row.messageid || row.id);
    const chat = pickText(row.chatid || row.wa_chatid);
    if (!id || !chat) return false;
    const key = `${chat}:${id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** ReadReceipt WuzAPI → refs de atualização (messages.update). */
export function extractWuzapiReadReceiptRefs(
  payload: unknown,
): Array<{ chatJid: string; messageIds: string[] }> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const body = payload as JsonObject;
  const type = pickText(body.type || body.Type).toLowerCase();
  if (type !== "readreceipt") return [];

  const event = (body.event ?? body.Event) as JsonObject | undefined;
  if (!event || typeof event !== "object" || Array.isArray(event)) return [];

  const chatJid = pickJid(
    event.Chat
    ?? event.chat
    ?? event.Source
    ?? event.source
    ?? event.SourceString
    ?? event.sourceString,
  );
  const rawIds = event.MessageIDs ?? event.MessageIds ?? event.messageIDs ?? event.messageIds ?? event.IDs;
  if (!chatJid || !Array.isArray(rawIds) || rawIds.length === 0) return [];

  const messageIds = rawIds.map((value) => String(value || "").trim()).filter(Boolean);
  return messageIds.length ? [{ chatJid, messageIds }] : [];
}

/** Adapta payload WuzAPI para o pipeline de ingest/Pusher existente. */
export function adaptWuzapiWebhookForIngest(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const body = payload as JsonObject;
  const messages = extractWuzapiMessagesFromPayload(body);
  if (!messages.length) return payload;
  return {
    ...body,
    messages,
    message: messages[0],
  };
}
