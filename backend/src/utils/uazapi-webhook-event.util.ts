type JsonObject = Record<string, unknown>;

const pickJid = (value: unknown): string | null => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
};

/** Normaliza o tipo do webhook UAZAPI (messages, groups, Group, etc.). */
export function normalizeUazapiWebhookEventType(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "unknown";
  const body = payload as JsonObject;

  const eventField = body.event;
  if (typeof eventField === "string" && eventField.trim()) {
    return eventField.trim().toLowerCase();
  }

  const eventType = String(body.EventType || body.eventType || "").trim().toLowerCase();
  if (eventType) return eventType;

  const type = String(body.type || "").trim().toLowerCase();
  if (type) return type;

  return "unknown";
}

/** Extrai JID do chat/grupo a partir de payloads variados da UAZAPI. */
export function extractUazapiWebhookChatJid(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as JsonObject;

  const rootCandidates = [
    body.chatid,
    body.chatId,
    body.wa_chatid,
    body.remoteJid,
  ];
  for (const candidate of rootCandidates) {
    const value = pickJid(candidate);
    if (value) return value;
  }

  const chatObj = body.chat;
  if (chatObj && typeof chatObj === "object" && !Array.isArray(chatObj)) {
    const fromChat = pickJid((chatObj as JsonObject).wa_chatid)
      || pickJid((chatObj as JsonObject).chatid)
      || pickJid((chatObj as JsonObject).chatJid);
    if (fromChat) return fromChat;
  }

  const messageObj = body.message;
  if (messageObj && typeof messageObj === "object" && !Array.isArray(messageObj)) {
    const fromMessage = pickJid((messageObj as JsonObject).chatid)
      || pickJid((messageObj as JsonObject).chatJid)
      || pickJid((messageObj as JsonObject).wa_chatid);
    if (fromMessage) return fromMessage;
  }

  const eventObj = body.event;
  if (eventObj && typeof eventObj === "object" && !Array.isArray(eventObj)) {
    const ev = eventObj as JsonObject;
    const fromGroupEvent = pickJid(ev.JID) || pickJid(ev.jid) || pickJid(ev.ChatJID) || pickJid(ev.chatid);
    if (fromGroupEvent) return fromGroupEvent;
  }

  const data = body.data;
  const nestedCandidates: unknown[] = [];

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as JsonObject;
    nestedCandidates.push(
      obj.chatid,
      obj.chatId,
      obj.wa_chatid,
      obj.remoteJid,
      obj.from,
      obj.JID,
      obj.jid,
      (obj.key as JsonObject | undefined)?.remoteJid,
    );
    const messageKey = (obj.message as JsonObject | undefined)?.key;
    if (messageKey && typeof messageKey === "object") {
      nestedCandidates.push((messageKey as JsonObject).remoteJid);
    }
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const row = item as JsonObject;
      nestedCandidates.push(
        row.chatid,
        row.chatId,
        row.wa_chatid,
        row.remoteJid,
        row.JID,
        row.jid,
        (row.key as JsonObject | undefined)?.remoteJid,
      );
    }
  }

  for (const candidate of nestedCandidates) {
    const value = pickJid(candidate);
    if (value) return value;
  }

  return null;
}

export type UazapiGroupMembershipChange = {
  groupJid: string;
  action: "join" | "leave" | "promote" | "demote" | "unknown";
  participants: string[];
  participantLids: string[];
  actorJid: string | null;
  actorLid: string | null;
  notifyName: string | null;
};

/** Lê Join/Leave/Promote/Demote do payload de grupos (EventType: groups). */
export function parseUazapiGroupMembershipChange(payload: unknown): UazapiGroupMembershipChange | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as JsonObject;
  const eventType = normalizeUazapiWebhookEventType(payload);
  if (eventType !== "groups" && eventType !== "group") return null;

  const ev = body.event;
  if (!ev || typeof ev !== "object" || Array.isArray(ev)) return null;
  const event = ev as JsonObject;

  const groupJid = pickJid(event.JID) || pickJid(event.jid);
  if (!groupJid || !groupJid.endsWith("@g.us")) return null;

  const asStringList = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  };

  const join = asStringList(event.Join);
  const leave = asStringList(event.Leave);
  const promote = asStringList(event.Promote);
  const demote = asStringList(event.Demote);

  let action: UazapiGroupMembershipChange["action"] = "unknown";
  let participants: string[] = [];
  if (leave.length) {
    action = "leave";
    participants = leave;
  } else if (join.length) {
    action = "join";
    participants = join;
  } else if (promote.length) {
    action = "promote";
    participants = promote;
  } else if (demote.length) {
    action = "demote";
    participants = demote;
  }

  return {
    groupJid,
    action,
    participants,
    participantLids: asStringList(event.LeaveLid || event.JoinLid || event.PromoteLid || event.DemoteLid),
    actorJid: pickJid(event.Sender) || pickJid(event.SenderPN) || pickJid(event.sender_pn),
    actorLid: pickJid(event.sender_lid),
    notifyName: pickJid(event.Notify),
  };
}
