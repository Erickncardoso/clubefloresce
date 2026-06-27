export type ParsedCommonGroup = {
  name: string;
  jid: string;
};

export type NormalizedChatDetails = {
  id: string;
  chatJid: string;
  waChatLid: string;
  phone: string;
  displayName: string;
  waName: string;
  waContactName: string;
  avatarUrl: string;
  avatarPreviewUrl: string;
  isGroup: boolean;
  isBlocked: boolean;
  isArchived: boolean;
  isPinned: boolean;
  muteEndTime: number;
  unreadCount: number;
  isSaved: boolean;
  isBusiness: boolean;
  commonGroups: ParsedCommonGroup[];
  commonGroupsRaw: string;
  waNotes: string;
  about: string;
  ephemeralExpiration: number;
  labels: string[];
  lead: {
    name: string;
    fullName: string;
    email: string;
    personalId: string;
    status: string;
    notes: string;
    tags: string[];
    isTicketOpen: boolean;
    assignedAttendantId: string;
    customFields: Record<string, string>;
  };
  chatbot: {
    summary: string;
    disableUntil: number;
    lastTriggerId: string;
  };
  syncedAt: string;
  raw: Record<string, unknown>;
};

const str = (value: unknown) => String(value ?? "").trim();

export const parseCommonGroups = (value: unknown): ParsedCommonGroup[] => {
  const text = str(value);
  if (!text) return [];
  return text
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return null;
      const match = trimmed.match(/^(.+)\(([^)]+)\)$/);
      if (match) {
        return { name: match[1].trim(), jid: match[2].trim() };
      }
      return { name: trimmed, jid: "" };
    })
    .filter((item): item is ParsedCommonGroup => Boolean(item?.name));
};

const readLeadCustomFields = (raw: Record<string, unknown>) => {
  const fields: Record<string, string> = {};
  for (let index = 1; index <= 20; index += 1) {
    const key = `lead_field${String(index).padStart(2, "0")}`;
    const value = str(raw[key]);
    if (value) fields[key] = value;
  }
  return fields;
};

export const normalizeUazapiChatDetails = (payload: unknown): NormalizedChatDetails | null => {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;
  const chatJid = str(raw.wa_chatid || raw.chatid || raw.id);
  if (!chatJid) return null;

  const waContactName = str(raw.wa_contactName);
  const waName = str(raw.wa_name);
  const displayName = str(raw.name || waName || waContactName);
  const avatarUrl = str(raw.image || raw.imagePreview);
  const avatarPreviewUrl = str(raw.imagePreview || raw.image);
  const labels = Array.isArray(raw.wa_label)
    ? raw.wa_label.map((item) => str(item)).filter(Boolean)
    : [];

  return {
    id: str(raw.id),
    chatJid,
    waChatLid: str(raw.wa_chatlid),
    phone: str(raw.phone),
    displayName,
    waName,
    waContactName,
    avatarUrl,
    avatarPreviewUrl,
    isGroup: Boolean(raw.wa_isGroup),
    isBlocked: Boolean(raw.wa_isBlocked),
    isArchived: Boolean(raw.wa_archived),
    isPinned: Boolean(raw.wa_isPinned),
    muteEndTime: Number(raw.wa_muteEndTime || 0),
    unreadCount: Number(raw.wa_unreadCount || 0),
    isSaved: Boolean(waContactName),
    isBusiness: Boolean(raw.wa_isBusiness || raw.isBusiness || raw.business),
    commonGroups: parseCommonGroups(raw.common_groups),
    commonGroupsRaw: str(raw.common_groups),
    waNotes: str(raw.wa_notes),
    about: str(raw.about || raw.status || raw.wa_about || raw.wa_status),
    ephemeralExpiration: Number(raw.wa_ephemeralExpiration || 0),
    labels,
    lead: {
      name: str(raw.lead_name),
      fullName: str(raw.lead_fullName),
      email: str(raw.lead_email),
      personalId: str(raw.lead_personalid),
      status: str(raw.lead_status),
      notes: str(raw.lead_notes),
      tags: Array.isArray(raw.lead_tags) ? raw.lead_tags.map((item) => str(item)).filter(Boolean) : [],
      isTicketOpen: Boolean(raw.lead_isTicketOpen),
      assignedAttendantId: str(raw.lead_assignedAttendant_id),
      customFields: readLeadCustomFields(raw)
    },
    chatbot: {
      summary: str(raw.chatbot_summary),
      disableUntil: Number(raw.chatbot_disableUntil || 0),
      lastTriggerId: str(raw.chatbot_lastTrigger_id)
    },
    syncedAt: new Date().toISOString(),
    raw
  };
};

export const normalizeContactJid = (value: string) => str(value).toLowerCase();
