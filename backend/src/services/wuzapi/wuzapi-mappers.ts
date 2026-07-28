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

export function normalizeLookupJid(value: string): string {
  return String(value || "").trim().toLowerCase();
}

/** IDs de grupo WhatsApp costumam ser numéricos longos (ex.: 120363…). */
export function looksLikeWhatsappGroupId(value: string): boolean {
  const bare = normalizePhone(value);
  return /^120\d{12,}$/.test(bare);
}

/** Telefone plausível para exibição — rejeita IDs de grupo e LIDs numéricos longos. */
export function isPlausibleWhatsappPhoneDigits(value: string): boolean {
  const digits = normalizePhone(value);
  if (!digits || digits.length < 10) return false;
  if (looksLikeWhatsappGroupId(digits)) return false;
  if (digits.length >= 14 && !digits.startsWith("55")) return false;
  if (digits.length > 13) return false;
  return true;
}

/** Formata dígitos para exibição na sidebar (+55 …). */
export function formatWhatsappPhoneLine(value: string): string {
  const d = normalizePhone(value);
  if (!isPlausibleWhatsappPhoneDigits(d)) return "";
  if (d.length >= 12 && d.startsWith("55")) {
    const rest = d.slice(2);
    if (rest.length === 11) return `+55 ${rest.slice(0, 2)} ${rest.slice(2, 7)}-${rest.slice(7)}`;
    if (rest.length === 10) return `+55 ${rest.slice(0, 2)} ${rest.slice(2, 6)}-${rest.slice(6)}`;
  }
  if (d.length === 11) return `+55 ${d.slice(0, 2)} ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `+55 ${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`;
  return `+${d}`;
}

export function resolveChatDisplayLabel(
  chatJid: string,
  options: {
    contactName?: string;
    groupName?: string;
    cachedName?: string;
    senderName?: string;
  } = {},
): string {
  const jid = normalizeLookupJid(chatJid);
  const isGroup = jid.endsWith("@g.us") || looksLikeWhatsappGroupId(jid);
  const contactName = String(options.contactName || "").trim();
  const groupName = String(options.groupName || "").trim();
  const cachedName = String(options.cachedName || "").trim();
  const senderName = String(options.senderName || "").trim();

  for (const candidate of [cachedName, groupName, contactName, senderName]) {
    if (!candidate) continue;
    if (chatNameLooksLikeBareJid(candidate, jid)) continue;
    if (!isPlausibleWhatsappPhoneDigits(candidate) && looksLikePhoneLabel(candidate)) continue;
    return candidate;
  }

  if (isGroup) return groupName || "Grupo";

  const phoneLine = formatWhatsappPhoneLine(jid);
  if (phoneLine) return phoneLine;
  if (jid.endsWith("@lid")) return "Contato";
  return "Contato";
}

function looksLikePhoneLabel(value: string): boolean {
  const raw = String(value || "").trim();
  if (!raw) return false;
  return /^\+?\d[\d\s()-]{7,}$/.test(raw);
}

/** JID canônico para consultas /chat/history e mapas de contato/grupo. */
export function resolveHistoryChatJid(value: string, groupJids?: Set<string>): string {
  const raw = normalizeLookupJid(value);
  if (!raw) return "";
  if (raw.endsWith("@g.us") || raw.endsWith("@s.whatsapp.net") || raw.endsWith("@lid")) return raw;
  if (raw.includes("@")) return raw;

  const asGroup = toGroupJid(raw);
  if (groupJids?.has(asGroup) || groupJids?.has(raw)) return asGroup;
  if (looksLikeWhatsappGroupId(raw)) return asGroup;
  return toChatJid(raw);
}

export function lookupInJidMap<T>(map: Map<string, T>, jid: string): T | undefined {
  const raw = normalizeLookupJid(jid);
  if (!raw) return undefined;

  const variants = new Set<string>([
    raw,
    raw.split("@")[0],
    normalizePhone(raw),
    toChatJid(raw),
    toGroupJid(raw),
    `${normalizePhone(raw)}@s.whatsapp.net`,
    `${normalizePhone(raw)}@g.us`,
  ]);

  for (const key of variants) {
    const normalized = normalizeLookupJid(key);
    if (!normalized) continue;
    const hit = map.get(normalized);
    if (hit) return hit;
  }

  return undefined;
}

export function pickContactDisplayName(contact?: Record<string, unknown> | null): string {
  if (!contact) return "";
  return String(
    contact.PushName || contact.pushName
    || contact.FullName || contact.fullName
    || contact.BusinessName || contact.businessName
    || contact.FirstName || contact.firstName
    || contact.VerifiedName || contact.verifiedName
    || contact.Name || contact.name
    || "",
  ).trim();
}

export function pickGroupDisplayName(group?: Record<string, unknown> | null): string {
  if (!group) return "";
  return String(
    group.Name || group.name
    || group.Subject || group.subject
    || group.GroupName || group.groupName
    || "",
  ).trim();
}

export function pickGroupAvatarUrl(group?: Record<string, unknown> | null): string {
  if (!group) return "";
  return String(
    group.ProfilePictureURL || group.profilePictureURL
    || group.ProfilePictureUrl || group.profilePictureUrl
    || group.PictureURL || group.pictureURL
    || group.Picture || group.picture
    || group.imgUrl || group.ImgUrl
    || "",
  ).trim();
}

export function chatNameLooksLikeBareJid(name: string, chatJid: string): boolean {
  const label = String(name || "").trim();
  const jid = normalizeLookupJid(chatJid);
  if (!label || !jid) return true;
  const bare = jid.split("@")[0];
  if (label === bare) return true;
  const labelDigits = label.replace(/\D/g, "");
  const bareDigits = bare.replace(/\D/g, "");
  if (labelDigits && bareDigits && labelDigits === bareDigits) return true;
  if (label.startsWith("+") && labelDigits === bareDigits) return true;
  return false;
}

export function isValidChatJid(value: string): boolean {
  const raw = normalizeLookupJid(value);
  if (!raw || raw === "0" || raw.startsWith("0@")) return false;
  const digits = normalizePhone(raw);
  if (raw.endsWith("@g.us") || looksLikeWhatsappGroupId(raw)) return digits.length >= 10;
  if (raw.endsWith("@lid")) return digits.length >= 8;
  if (raw.endsWith("@s.whatsapp.net")) return isPlausibleWhatsappPhoneDigits(digits);
  if (raw.includes("@")) return digits.length >= 8;
  if (looksLikeWhatsappGroupId(raw)) return true;
  return isPlausibleWhatsappPhoneDigits(digits);
}

export function pickVerifiedName(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const row = value as Record<string, unknown>;
  const details = row.Details || row.details;
  if (details && typeof details === "object") {
    const name = String(
      (details as Record<string, unknown>).verifiedName
      || (details as Record<string, unknown>).VerifiedName
      || "",
    ).trim();
    if (name) return name;
  }
  return String(row.name || row.Name || "").trim();
}

export function pickUserInfoDisplayName(userInfo?: Record<string, unknown> | null): string {
  if (!userInfo) return "";
  const verified = pickVerifiedName(userInfo.VerifiedName ?? userInfo.verifiedName);
  if (verified) return verified;
  return pickContactDisplayName(userInfo);
}

export function pickAvatarUrl(avatar: unknown): string {
  if (!avatar) return "";
  if (typeof avatar === "string") {
    const direct = avatar.trim();
    if (!direct) return "";
    if (/^https?:\/\//i.test(direct) || direct.startsWith("data:image/")) return direct;
    if (/^[A-Za-z0-9+/=\r\n]+$/.test(direct.replace(/\s/g, "")) && direct.replace(/\s/g, "").length >= 120) {
      return dataUriFromBase64("image/jpeg", direct.replace(/\s/g, ""));
    }
    return "";
  }
  if (typeof avatar !== "object") return "";
  const row = avatar as Record<string, unknown>;
  for (const field of [
    "URL", "url", "Url", "Link", "link",
    "Image", "image", "Picture", "picture", "Src", "src",
    "ProfilePictureURL", "profilePictureURL", "ProfilePictureUrl", "profilePictureUrl",
    "imgUrl", "ImgUrl",
  ]) {
    const hit = String(row[field] || "").trim();
    if (/^https?:\/\//i.test(hit) || hit.startsWith("data:image/")) return hit;
  }
  const base64 = String(row.Base64 || row.base64 || row.Data || row.data || "").trim();
  if (base64) {
    return dataUriFromBase64(String(row.Mimetype || row.mimetype || "image/jpeg"), base64);
  }
  const nested = row.data || row.Data || row.response || row.Response;
  if (nested && nested !== avatar) return pickAvatarUrl(nested);
  return "";
}

export function pickContactAvatarUrl(contact?: Record<string, unknown> | null): string {
  if (!contact) return "";
  return pickAvatarUrl(contact) || pickGroupAvatarUrl(contact);
}

export function resolveAvatarPhoneForChat(
  chat: Record<string, unknown>,
  contactsMap: Map<string, Record<string, unknown>>,
): string {
  const jid = normalizeLookupJid(String(chat.wa_chatid || chat.chatid || ""));
  if (!jid) return "";
  if (isGroupJid(jid)) return toGroupJid(jid);

  const explicitPhone = String(chat.phone || "").trim();
  if (explicitPhone) {
    const digits = normalizePhone(explicitPhone);
    if (isPlausibleWhatsappPhoneDigits(digits)) return digits;
  }

  if (jid.endsWith("@s.whatsapp.net")) {
    const digits = normalizePhone(jid);
    if (isPlausibleWhatsappPhoneDigits(digits)) return digits;
  }

  const contact = lookupInJidMap(contactsMap, jid);
  if (contact) {
    const avatarFromContact = pickContactAvatarUrl(contact);
    if (avatarFromContact) {
      chat.image = avatarFromContact;
      chat.imagePreview = avatarFromContact;
      chat.avatarUrl = avatarFromContact;
    }
    for (const field of ["JID", "jid", "Phone", "phone", "LID", "lid"]) {
      const candidate = normalizeLookupJid(String(contact[field] || ""));
      if (!candidate.endsWith("@s.whatsapp.net")) continue;
      const digits = normalizePhone(candidate);
      if (isPlausibleWhatsappPhoneDigits(digits)) return digits;
    }
  }

  if (jid.endsWith("@lid")) {
    for (const [key, row] of contactsMap.entries()) {
      if (!key.endsWith("@s.whatsapp.net")) continue;
      const rowLid = normalizeLookupJid(String(row.LID || row.lid || ""));
      if (rowLid && rowLid === jid) {
        const digits = normalizePhone(key);
        if (isPlausibleWhatsappPhoneDigits(digits)) return digits;
      }
    }
  }

  const digits = normalizePhone(jid);
  return isPlausibleWhatsappPhoneDigits(digits) ? digits : "";
}

/** Normaliza payload de /user/contacts para mapa jid → info. */
export function normalizeContactsRecord(raw: unknown): Record<string, Record<string, unknown>> {
  const unwrapped = raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)
    ? (raw as Record<string, unknown>).data
    : raw;
  if (!unwrapped || typeof unwrapped !== "object") return {};

  if (Array.isArray(unwrapped)) {
    const map: Record<string, Record<string, unknown>> = {};
    for (const item of unwrapped) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const jid = normalizeLookupJid(String(row.JID || row.jid || row.id || ""));
      if (jid) map[jid] = row;
    }
    return map;
  }

  const record = unwrapped as Record<string, unknown>;
  const nested = record.contacts || record.Contacts;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, Record<string, unknown>>;
  }

  const map: Record<string, Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    if (["code", "success", "data", "message", "error"].includes(key)) continue;
    map[normalizeLookupJid(key)] = value as Record<string, unknown>;
  }
  return map;
}

export function applyMapsMetadataToChat(
  chat: Record<string, unknown>,
  contactsMap: Map<string, Record<string, unknown>>,
  groupsMap: Map<string, Record<string, unknown>>,
): void {
  const jid = normalizeLookupJid(String(chat.wa_chatid || chat.chatid || ""));
  if (!jid) return;

  if (isGroupJid(jid)) {
    const group = lookupInJidMap(groupsMap, jid);
    if (!group) return;
    const groupName = pickGroupDisplayName(group);
    const groupAvatar = pickGroupAvatarUrl(group);
    if (groupName) {
      chat.name = groupName;
      chat.wa_name = groupName;
    }
    if (groupAvatar) {
      chat.image = groupAvatar;
      chat.imagePreview = groupAvatar;
      chat.avatarUrl = groupAvatar;
    }
    return;
  }

  const contact = lookupInJidMap(contactsMap, jid);
  if (!contact) return;
  const contactName = pickContactDisplayName(contact);
  if (contactName) {
    chat.name = contactName;
    chat.wa_name = contactName;
    chat.wa_contactName = contactName;
  }
  const contactAvatar = pickContactAvatarUrl(contact);
  if (contactAvatar) {
    chat.image = contactAvatar;
    chat.imagePreview = contactAvatar;
    chat.avatarUrl = contactAvatar;
  }
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

  const readFlag = (value: unknown): boolean | null => {
    if (value === true || value === 1 || value === "1" || value === "true") return true;
    if (value === false || value === 0 || value === "0" || value === "false") return false;
    return null;
  };
  const resolveFromMe = (): boolean => {
    for (const field of [
      row.from_me, row.fromMe, row.is_from_me, row.isFromMe, row.wasSentByMe,
    ]) {
      const hit = readFlag(field);
      if (hit != null) return hit;
    }
    const info = row.Info ?? row.info;
    if (info && typeof info === "object") {
      const block = info as Record<string, unknown>;
      for (const field of [block.IsFromMe, block.isFromMe, block.FromMe, block.fromMe]) {
        const hit = readFlag(field);
        if (hit != null) return hit;
      }
    }
    const key = row.Key ?? row.key;
    if (key && typeof key === "object") {
      const block = key as Record<string, unknown>;
      for (const field of [block.FromMe, block.fromMe]) {
        const hit = readFlag(field);
        if (hit != null) return hit;
      }
    }
    return false;
  };

  return {
    id: messageId,
    messageid: messageId,
    chatid: chatJid,
    wa_chatid: chatJid,
    fromMe: resolveFromMe(),
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
    const avatarUrl = pickContactAvatarUrl(row);
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
      image: avatarUrl,
      imagePreview: avatarUrl,
      avatarUrl,
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

const readMessageBlock = (row: Record<string, unknown>): Record<string, unknown> | null => {
  const candidates = [row.Message, row.message, row.msg];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
    }
  }
  return null;
};

const readInfoBlock = (row: Record<string, unknown>): Record<string, unknown> | null => {
  const info = row.Info ?? row.info;
  return info && typeof info === "object" && !Array.isArray(info)
    ? (info as Record<string, unknown>)
    : null;
};

/** Extrai texto de blocos whatsmeow (Conversation, ExtendedText, wrappers, etc.). */
function deepExtractMessageText(source: unknown, depth = 0): string {
  if (!source || typeof source !== "object" || Array.isArray(source) || depth > 5) return "";
  const row = source as Record<string, unknown>;

  const direct = pickNestedText(
    row.text
    || row.body
    || row.conversation
    || row.Conversation
    || row.caption
    || row.Caption,
  );
  if (direct) return direct;

  const extended = (row.extendedTextMessage || row.ExtendedTextMessage) as Record<string, unknown> | undefined;
  const extText = pickNestedText(extended?.text || extended?.Text);
  if (extText) return extText;

  const image = (row.imageMessage || row.ImageMessage) as Record<string, unknown> | undefined;
  if (image) return pickNestedText(image.caption || image.Caption) || "[imagem]";
  const video = (row.videoMessage || row.VideoMessage) as Record<string, unknown> | undefined;
  if (video) return pickNestedText(video.caption || video.Caption) || "[vídeo]";
  if (row.audioMessage || row.AudioMessage) return "[áudio]";
  if (row.stickerMessage || row.StickerMessage) return "[sticker]";
  if (row.documentMessage || row.DocumentMessage) return "[documento]";
  if (row.contactMessage || row.ContactMessage) return "[contato]";
  if (row.locationMessage || row.LocationMessage) return "[localização]";

  for (const key of [
    "ephemeralMessage",
    "EphemeralMessage",
    "viewOnceMessage",
    "ViewOnceMessage",
    "buttonsResponseMessage",
    "ButtonsResponseMessage",
    "templateButtonReplyMessage",
    "TemplateButtonReplyMessage",
    "listResponseMessage",
    "ListResponseMessage",
  ]) {
    const wrapper = row[key] as Record<string, unknown> | undefined;
    if (!wrapper || typeof wrapper !== "object") continue;
    const inner = deepExtractMessageText(wrapper.message || wrapper.Message, depth + 1);
    if (inner) return inner;
  }

  const message = readMessageBlock(row);
  if (message && message !== row) {
    const nested = deepExtractMessageText(message, depth + 1);
    if (nested) return nested;
  }

  const nestedRaw = row.raw;
  if (nestedRaw && nestedRaw !== row) {
    const fromNested = deepExtractMessageText(nestedRaw, depth + 1);
    if (fromNested) return fromNested;
  }

  return "";
}

/** Extrai preview legível de raw whatsmeow/UAZAPI armazenado no DB. */
export function extractPreviewFromMessageRaw(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const row = raw as Record<string, unknown>;

  const direct = pickNestedText(row.text || row.body || row.message || row.wa_lastMsgText);
  if (direct) return direct;

  const fromDeep = deepExtractMessageText(row);
  if (fromDeep) return fromDeep;

  const msgType = String(row.messageType || row.type || row.message_type || "").trim().toLowerCase();
  if (msgType.includes("audio")) return "[áudio]";
  if (msgType.includes("image")) return "[imagem]";
  if (msgType.includes("video")) return "[vídeo]";
  if (msgType.includes("document")) return "[documento]";
  if (msgType.includes("sticker")) return "[sticker]";

  return "";
}

/** Chave estável para fundir @lid ↔ @s.whatsapp.net na sidebar. */
export function canonicalConversationSummaryKey(summary: {
  chatJid: string;
  raw?: unknown;
}): string {
  const jid = normalizeLookupJid(summary.chatJid);
  if (!jid) return "";
  if (jid.endsWith("@g.us") || looksLikeWhatsappGroupId(jid)) return toGroupJid(jid);
  if (jid.startsWith("0@")) return "";

  const raw = summary.raw && typeof summary.raw === "object"
    ? (summary.raw as Record<string, unknown>)
    : {};

  const pnCandidates = [
    raw.sender_pn,
    raw.senderPn,
    raw.SenderPn,
    raw.recipient,
    raw.to,
  ];
  for (const candidate of pnCandidates) {
    const pn = pickNestedText(candidate).toLowerCase();
    if (pn.endsWith("@s.whatsapp.net") && isPlausibleWhatsappPhoneDigits(normalizePhone(pn))) {
      return pn;
    }
  }

  const info = readInfoBlock(raw);
  if (info) {
    for (const field of [info.Sender, info.sender, info.RemoteJid, info.remoteJid, info.Chat, info.chat]) {
      const value = pickNestedText(field).toLowerCase();
      if (value.endsWith("@s.whatsapp.net") && isPlausibleWhatsappPhoneDigits(normalizePhone(value))) {
        return value;
      }
    }
  }

  const key = raw.key && typeof raw.key === "object" ? (raw.key as Record<string, unknown>) : null;
  if (key) {
    const remote = pickNestedText(key.remoteJid || key.RemoteJid || key.RemoteJID).toLowerCase();
    if (remote.endsWith("@s.whatsapp.net") && isPlausibleWhatsappPhoneDigits(normalizePhone(remote))) {
      return remote;
    }
  }

  if (jid.endsWith("@lid")) return jid;
  if (jid.endsWith("@s.whatsapp.net") && isPlausibleWhatsappPhoneDigits(normalizePhone(jid))) return jid;
  return jid;
}

export function mergeConversationSummaries<T extends {
  chatJid: string;
  messageTimestamp: bigint | number;
  fromMe?: boolean;
  raw?: unknown;
}>(summaries: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const summary of summaries) {
    const key = canonicalConversationSummaryKey(summary);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev || Number(summary.messageTimestamp || 0) > Number(prev.messageTimestamp || 0)) {
      byKey.set(key, summary);
    }
  }
  return Array.from(byKey.values());
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
  const isGroup = chatJid.endsWith("@g.us") || looksLikeWhatsappGroupId(chatJid);
  const previewText = preview || (Number(summary.messageTimestamp || 0) > 0 ? "Mensagem" : "");

  const rawRow = summary.raw && typeof summary.raw === "object"
    ? (summary.raw as Record<string, unknown>)
    : {};
  const rawSenderName = String(
    rawRow.sender_name || rawRow.senderName || rawRow.pushName || rawRow.PushName || "",
  ).trim();

  const contactName = pickContactDisplayName(contact);
  const groupName = pickGroupDisplayName(group);
  const groupAvatar = pickGroupAvatarUrl(group);
  const cachedName = String(cached?.name || cached?.pushName || "").trim();
  const name = resolveChatDisplayLabel(chatJid, {
    contactName,
    groupName,
    cachedName,
    senderName: rawSenderName,
  });

  const avatarUrl = String(
    cached?.avatarUrl
    || groupAvatar
    || "",
  ).trim();

  return {
    wa_chatid: chatJid,
    chatid: chatJid,
    id: chatJid,
    name,
    wa_name: name,
    wa_contactName: contactName || rawSenderName || name,
    wa_isGroup: isGroup,
    wa_unreadCount: 0,
    wa_lastMsgTimestamp: tsSec,
    lastMessageTime: tsRaw > 1_000_000_000_000 ? tsRaw : tsRaw * 1000,
    wa_lastMsgText: previewText,
    wa_lastMessageTextVote: previewText,
    lastMessage: previewText,
    fromMe: Boolean(summary.fromMe),
    phone: isPlausibleWhatsappPhoneDigits(normalizePhone(chatJid)) ? normalizePhone(chatJid) : "",
    ...(chatJid.endsWith("@lid") ? { wa_chatlid: chatJid } : {}),
    image: avatarUrl,
    imagePreview: avatarUrl,
    avatarUrl,
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
  const raw = String(number || "").trim().toLowerCase();
  const chatJid = raw.endsWith("@g.us") || looksLikeWhatsappGroupId(raw)
    ? toGroupJid(raw)
    : (toChatJid(number) || toGroupJid(number));
  const userInfo = info?.Users
    ? Object.values(info.Users)[0] as Record<string, unknown>
    : (info && typeof info === "object" ? info as Record<string, unknown> : {});
  const display = pickUserInfoDisplayName(userInfo)
    || pickGroupDisplayName(info as Record<string, unknown>)
    || pickContactDisplayName(info as Record<string, unknown>);
  const image = pickAvatarUrl(avatar) || pickGroupAvatarUrl(info as Record<string, unknown>);
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
    avatarUrl: image,
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
