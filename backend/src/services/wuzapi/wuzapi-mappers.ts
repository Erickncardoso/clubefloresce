/** Helpers de JID/telefone e adaptadores UAZAPI ↔ WuzAPI. */

export function normalizePhone(value: string): string {
  const raw = String(value || "").trim();
  if (raw.includes("@")) return raw.split("@")[0].replace(/\D/g, "");
  return raw.replace(/\D/g, "");
}

export function toChatJid(value: string): string {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("@")) return raw;
  const digits = normalizePhone(raw);
  return digits ? `${digits}@s.whatsapp.net` : "";
}

export function toGroupJid(value: string): string {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.endsWith("@g.us")) return raw;
  return raw.includes("@") ? raw : `${raw}@g.us`;
}

export function isGroupJid(value: string): boolean {
  return String(value || "").trim().toLowerCase().endsWith("@g.us");
}

export function dataUriFromBase64(mimetype: string, base64: string): string {
  const mime = String(mimetype || "application/octet-stream").trim();
  const pure = String(base64 || "").replace(/^data:[^;]+;base64,/, "").trim();
  return pure.startsWith("data:") ? pure : `data:${mime};base64,${pure}`;
}

export function mapWuzHistoryRowToUazMessage(row: Record<string, unknown>, chatJid: string): Record<string, unknown> {
  const messageId = String(row.message_id || row.messageId || row.id || "").trim();
  const tsRaw = row.timestamp || row.Timestamp;
  let timestampMs = Date.now();
  if (typeof tsRaw === "number") timestampMs = tsRaw > 1e12 ? tsRaw : tsRaw * 1000;
  else if (typeof tsRaw === "string") {
    const parsed = Date.parse(tsRaw);
    if (!Number.isNaN(parsed)) timestampMs = parsed;
  }

  const senderJid = String(row.sender_jid || row.senderJid || row.from || "").trim();
  const text = String(row.text_content || row.text || row.body || "").trim();
  const type = String(row.message_type || row.type || "text").toLowerCase();

  return {
    id: messageId,
    messageid: messageId,
    chatid: chatJid,
    wa_chatid: chatJid,
    fromMe: Boolean(row.from_me ?? row.fromMe ?? row.is_from_me),
    sender: senderJid,
    senderName: String(row.sender_name || row.pushName || ""),
    messageTimestamp: Math.floor(timestampMs / 1000),
    text,
    body: text,
    type,
    mimetype: String(row.media_mimetype || row.mime_type || ""),
    mediaUrl: String(row.media_link || row.mediaLink || ""),
    raw: row,
  };
}

export function mapContactsRecordToUazChats(contacts: Record<string, unknown>): Record<string, unknown>[] {
  return Object.entries(contacts || {}).map(([jid, info]) => {
    const row = (info && typeof info === "object" ? info : {}) as Record<string, unknown>;
    const name = String(row.PushName || row.FullName || row.BusinessName || row.FirstName || "").trim();
    return {
      wa_chatid: jid,
      chatid: jid,
      id: jid,
      name,
      wa_name: name,
      wa_contactName: name,
      wa_isGroup: jid.endsWith("@g.us"),
      wa_unreadCount: 0,
      wa_lastMsgTimestamp: 0,
      wa_lastMsgText: "",
      raw: row,
    };
  });
}

export function mapWuzGroupsToUazChats(groups: unknown[]): Record<string, unknown>[] {
  return (groups || []).map((group) => {
    const row = (group && typeof group === "object" ? group : {}) as Record<string, unknown>;
    const jid = String(row.JID || row.jid || row.GroupJID || "").trim();
    const name = String(row.Name || row.name || "").trim();
    return {
      wa_chatid: jid,
      chatid: jid,
      id: jid,
      name,
      wa_name: name,
      wa_isGroup: true,
      wa_unreadCount: 0,
      wa_lastMsgTimestamp: 0,
      wa_lastMsgText: "",
      raw: row,
    };
  });
}

const pickNestedText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  return "";
};

/** Extrai preview legível de raw whatsmeow/UAZAPI armazenado no DB. */
export function extractPreviewFromMessageRaw(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const row = raw as Record<string, unknown>;

  const direct = pickNestedText(row.text || row.body || row.wa_lastMsgText);
  if (direct) return direct;

  const message = (row.Message || row.message) as Record<string, unknown> | undefined;
  if (message && typeof message === "object") {
    const conversation = pickNestedText(message.conversation);
    if (conversation) return conversation;
    const extended = message.extendedTextMessage as Record<string, unknown> | undefined;
    const extText = pickNestedText(extended?.text);
    if (extText) return extText;
    const image = message.imageMessage as Record<string, unknown> | undefined;
    if (image) return pickNestedText(image.caption) || "[imagem]";
    const video = message.videoMessage as Record<string, unknown> | undefined;
    if (video) return pickNestedText(video.caption) || "[vídeo]";
    if (message.audioMessage) return "[áudio]";
    if (message.stickerMessage) return "[sticker]";
    if (message.documentMessage) return "[documento]";
    if (message.contactMessage) return "[contato]";
    if (message.locationMessage) return "[localização]";
  }

  return "";
}

export function mapConversationSummaryToUazChat(
  summary: {
    chatJid: string;
    messageTimestamp: bigint | number;
    fromMe?: boolean;
    raw?: unknown;
  },
  contact?: Record<string, unknown> | null,
  group?: Record<string, unknown> | null,
  cached?: { name?: string | null; pushName?: string | null; avatarUrl?: string | null },
): Record<string, unknown> {
  const chatJid = String(summary.chatJid || "").trim().toLowerCase();
  const tsRaw = Number(summary.messageTimestamp || 0);
  const tsSec = tsRaw > 1_000_000_000_000 ? Math.floor(tsRaw / 1000) : Math.floor(tsRaw);
  const preview = extractPreviewFromMessageRaw(summary.raw);
  const isGroup = chatJid.endsWith("@g.us");

  const contactName = contact
    ? String(contact.PushName || contact.FullName || contact.BusinessName || contact.FirstName || "").trim()
    : "";
  const groupName = group ? String(group.Name || group.name || "").trim() : "";
  const name = String(cached?.name || cached?.pushName || groupName || contactName || chatJid.split("@")[0] || "").trim();

  return {
    wa_chatid: chatJid,
    chatid: chatJid,
    id: chatJid,
    name,
    wa_name: name,
    wa_contactName: contactName || name,
    wa_isGroup: isGroup,
    wa_unreadCount: 0,
    wa_lastMsgTimestamp: tsSec,
    wa_lastMsgText: preview,
    wa_lastMessageTextVote: preview,
    fromMe: Boolean(summary.fromMe),
    image: cached?.avatarUrl || "",
    imagePreview: cached?.avatarUrl || "",
    avatarUrl: cached?.avatarUrl || "",
    raw: summary.raw,
  };
}

export function mapUserCheckToUaz(body: any): any {
  const users = Array.isArray(body?.Users) ? body.Users : [];
  return {
    results: users.map((row: any) => ({
      number: String(row.Query || row.JID || "").replace(/@.+$/, ""),
      jid: String(row.JID || ""),
      exists: Boolean(row.IsInWhatsapp),
      verifiedName: String(row.VerifiedName || ""),
    })),
  };
}

export function mapChatDetailsToUaz(number: string, avatar: any, info: any): Record<string, unknown> {
  const chatJid = toChatJid(number) || toGroupJid(number);
  const userInfo = info?.Users ? Object.values(info.Users)[0] as Record<string, unknown> : {};
  const display = String(userInfo?.VerifiedName || userInfo?.Status || "").trim();
  const image = String(avatar?.URL || avatar?.url || "").trim();
  return {
    wa_chatid: chatJid,
    chatid: chatJid,
    id: chatJid,
    phone: normalizePhone(chatJid),
    name: display,
    wa_name: display,
    wa_contactName: display,
    image,
    imagePreview: image,
    wa_isGroup: isGroupJid(chatJid),
    about: String(userInfo?.Status || ""),
    raw: { avatar, info },
  };
}

export function mapSendTextBody(body: Record<string, unknown>) {
  const phone = normalizePhone(String(body.number || body.chatid || body.phone || ""));
  const text = String(body.text || body.body || body.message || "").trim();
  const payload: Record<string, unknown> = { Phone: phone, Body: text };
  const replyId = String(body.replyid || body.replyId || body.quoted || "").trim();
  if (replyId) {
    payload.ContextInfo = {
      StanzaId: replyId,
      Participant: toChatJid(String(body.number || body.chatid || "")),
    };
  }
  if (body.id) payload.Id = body.id;
  return payload;
}

export function mapSendMediaBody(body: Record<string, unknown>) {
  const phone = normalizePhone(String(body.number || body.chatid || ""));
  const type = String(body.type || body.mediatype || "image").toLowerCase();
  const mimetype = String(body.mimetype || body.mimeType || "application/octet-stream");
  const file = dataUriFromBase64(mimetype, String(body.file || body.media || ""));
  const caption = String(body.text || body.caption || "").trim();
  const docName = String(body.docName || body.filename || body.fileName || "document").trim();

  if (type === "image" || type === "photo") {
    return { path: "/chat/send/image", payload: { Phone: phone, Image: file, Caption: caption, Id: body.id }, api: "chatSendImage" as const };
  }
  if (type === "sticker") {
    return { path: "/chat/send/sticker", payload: { Phone: phone, Sticker: file, Id: body.id }, api: "chatSendSticker" as const };
  }
  if (type === "template") {
    return { path: "/chat/send/template", payload: { Phone: phone, ...body, Id: body.id }, api: "chatSendTemplate" as const };
  }
  if (type === "video") {
    return { path: "/chat/send/video", payload: { Phone: phone, Video: file, Caption: caption, Id: body.id }, api: "chatSendVideo" as const };
  }
  if (type === "audio" || type === "ptt" || type === "voice") {
    return {
      path: "/chat/send/audio",
      payload: {
        Phone: phone,
        Audio: file,
        PTT: type === "ptt" || type === "voice",
        MimeType: mimetype,
        Id: body.id,
      },
      api: "chatSendAudio" as const,
    };
  }
  return {
    path: "/chat/send/document",
    payload: { Phone: phone, Document: file, FileName: docName, Id: body.id },
    api: "chatSendDocument" as const,
  };
}

export function mapMarkReadBody(body: Record<string, unknown>) {
  const ids = Array.isArray(body.id) ? body.id : (body.id ? [body.id] : []);
  const chatPhone = normalizePhone(String(body.number || body.chatid || body.chatPhone || ""));
  return {
    Id: ids.map(String),
    ChatPhone: chatPhone,
    SenderPhone: normalizePhone(String(body.senderPhone || body.sender || chatPhone)),
  };
}

export function normalizeProxyResponse(result: any): any {
  if (!result || typeof result !== "object") return result;
  if ("data" in result && ("success" in result || "code" in result)) {
    const data = (result as any).data;
    if (data && typeof data === "object") {
      const id = String((data as any).Id || (data as any).id || "").trim();
      if (id && !(data as any).messageid) {
        return { ...data, id, messageid: id };
      }
    }
    return data ?? result;
  }
  return result;
}

export function unsupportedUazFeature(feature: string): never {
  throw new Error(`[WuzAPI] Recurso UAZAPI não disponível: ${feature}`);
}
