import { WhatsappChatRepository, UpsertWhatsappChatInput } from "../repositories/whatsapp_chat.repository";
import { WhatsappService } from "./whatsapp.service";

const UAZAPI_BASE_URL = process.env.UAZAPI_SERVER_URL || "https://erickcardoso.uazapi.com";
const HTTP_TIMEOUT_MS = 8000;
const AVATAR_ENRICH_LIMIT = 20;

type UazChat = Record<string, any>;

export class WhatsappChatSyncService {
  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs = HTTP_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private readonly repository = new WhatsappChatRepository();
  private readonly whatsappService = new WhatsappService();

  private normalizeChat(chat: UazChat): UpsertWhatsappChatInput | null {
    const chatJid = chat.wa_chatid || chat.chatid || chat.id;
    if (!chatJid || typeof chatJid !== "string") return null;

    const lastMessageTime = Number(chat.wa_lastMsgTimestamp || chat.lastMessageTime || chat.timestamp || 0);

    return {
      chatJid,
      name: chat.name || chat.wa_name || "",
      pushName: chat.wa_contactName || chat.wa_name || chat.name || "",
      avatarUrl: chat.image || chat.imagePreview || "",
      isGroup: Boolean(chat.wa_isGroup || chatJid.endsWith("@g.us")),
      lastMessage: chat.wa_lastMsgText || chat.wa_lastMessageTextVote || "",
      lastMessageTime: lastMessageTime > 0 ? BigInt(lastMessageTime) : null,
      unreadCount: Number(chat.wa_unreadCount || 0),
      raw: chat
    };
  }

  private async fetchUazChatsPage(
    instanceToken: string,
    limit: number,
    offset: number,
    filters: Record<string, unknown> = {}
  ): Promise<{ chats: UazChat[]; totalRecords: number | null }> {
    const res = await this.fetchWithTimeout(`${UAZAPI_BASE_URL}/chat/find`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: instanceToken
      },
      body: JSON.stringify({
        operator: "AND",
        sort: "-wa_lastMsgTimestamp",
        limit,
        offset,
        ...filters
      })
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.message || `Erro /chat/find (${res.status})`);
    return {
      chats: Array.isArray(data?.chats) ? data.chats : [],
      totalRecords: typeof data?.pagination?.totalRecords === "number" ? data.pagination.totalRecords : null
    };
  }

  private async fetchUazChatsByFilter(instanceToken: string, filters: Record<string, unknown> = {}): Promise<UazChat[]> {
    const pageSize = 300;
    const maxPages = 20;
    const allChats: UazChat[] = [];
    let offset = 0;
    let totalRecords: number | null = null;

    for (let page = 0; page < maxPages; page++) {
      const { chats, totalRecords: pageTotal } = await this.fetchUazChatsPage(instanceToken, pageSize, offset, filters);
      if (totalRecords === null && pageTotal !== null) totalRecords = pageTotal;
      if (chats.length === 0) break;

      allChats.push(...chats);
      offset += chats.length;

      if (totalRecords !== null && offset >= totalRecords) break;
      if (chats.length < pageSize) break;
    }

    return allChats;
  }

  private async fetchUazChats(instanceToken: string): Promise<UazChat[]> {
    // Busca por múltiplas estratégias para evitar perda de chats por comportamento específico de filtro.
    const [privateChats, groupChats, allChats] = await Promise.allSettled([
      this.fetchUazChatsByFilter(instanceToken, { wa_isGroup: false }),
      this.fetchUazChatsByFilter(instanceToken, { wa_isGroup: true }),
      this.fetchUazChatsByFilter(instanceToken)
    ]);

    const privateList = privateChats.status === "fulfilled" ? privateChats.value : [];
    const groupList = groupChats.status === "fulfilled" ? groupChats.value : [];
    const fullList = allChats.status === "fulfilled" ? allChats.value : [];

    if (privateList.length === 0 && groupList.length === 0 && fullList.length === 0) {
      return [];
    }

    return this.mergeChatsByJid([...privateList, ...groupList, ...fullList]);
  }

  private async fetchUazContacts(instanceToken: string): Promise<UazChat[]> {
    const res = await this.fetchWithTimeout(`${UAZAPI_BASE_URL}/contacts/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: instanceToken
      },
      body: JSON.stringify({
        limit: 1000,
        offset: 0,
        contactScope: "all"
      })
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.message || `Erro /contacts/list (${res.status})`);

    const contacts = Array.isArray(data?.contacts) ? data.contacts : [];
    return contacts.map((contact: any) => ({
      wa_chatid: contact.jid,
      wa_name: contact.contact_name || contact.contact_FirstName || "",
      wa_contactName: contact.contact_name || "",
      name: contact.contact_name || contact.contact_FirstName || "",
      wa_isGroup: String(contact.jid || "").endsWith("@g.us"),
      wa_unreadCount: 0,
      wa_lastMsgTimestamp: 0
    }));
  }

  private mergeChatsByJid(chats: UazChat[]): UazChat[] {
    const byJid = new Map<string, UazChat>();

    for (const chat of chats) {
      const jid = chat?.wa_chatid || chat?.chatid || chat?.id;
      if (!jid) continue;

      const existing = byJid.get(jid);
      if (!existing) {
        byJid.set(jid, chat);
        continue;
      }

      byJid.set(jid, {
        ...existing,
        ...chat,
        wa_isPinned: typeof chat.wa_isPinned === "boolean" ? chat.wa_isPinned : Boolean(existing.wa_isPinned),
        wa_name: chat.wa_name || existing.wa_name || "",
        wa_contactName: chat.wa_contactName || existing.wa_contactName || "",
        name: chat.name || existing.name || "",
        image: chat.image || existing.image || "",
        imagePreview: chat.imagePreview || existing.imagePreview || "",
        wa_lastMsgTimestamp: Math.max(
          Number(existing.wa_lastMsgTimestamp || 0),
          Number(chat.wa_lastMsgTimestamp || 0)
        ),
        wa_unreadCount: Math.max(
          Number(existing.wa_unreadCount || 0),
          Number(chat.wa_unreadCount || 0)
        )
      });
    }

    return Array.from(byJid.values());
  }

  private indexContactsByJid(contacts: UazChat[]): Map<string, UazChat> {
    const map = new Map<string, UazChat>();
    for (const contact of contacts) {
      const jid = contact?.wa_chatid || contact?.chatid || contact?.id;
      if (!jid) continue;
      map.set(jid, contact);
    }
    return map;
  }

  private async fetchMissingAvatarFromDetails(instanceToken: string, chatJid: string): Promise<string> {
    const res = await this.fetchWithTimeout(`${UAZAPI_BASE_URL}/chat/details`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: instanceToken
      },
      body: JSON.stringify({
        number: chatJid,
        preview: true
      })
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) return "";
    return data?.imagePreview || data?.image || "";
  }

  async syncAndList(userId: string, _forceRefresh = false): Promise<any[]> {
    const instanceToken = await this.whatsappService.getInstanceToken(userId);
    if (!instanceToken) throw new Error("Instância não configurada.");

    const chats = await this.fetchUazChats(instanceToken);
    const contacts = await this.fetchUazContacts(instanceToken);
    const contactsByJid = this.indexContactsByJid(contacts);

    const enrichedChats = chats.map((chat) => {
      const jid = chat?.wa_chatid || chat?.chatid || chat?.id;
      if (!jid) return chat;
      const contact = contactsByJid.get(jid);
      if (!contact) return chat;
      return {
        ...chat,
        wa_name: chat.wa_name || contact.wa_name || "",
        wa_contactName: chat.wa_contactName || contact.wa_contactName || "",
        name: chat.name || contact.name || "",
        image: chat.image || contact.image || "",
        imagePreview: chat.imagePreview || contact.imagePreview || ""
      };
    });

    const merged = this.mergeChatsByJid(enrichedChats);
    const normalized = merged.map((chat) => this.normalizeChat(chat)).filter(Boolean) as UpsertWhatsappChatInput[];
    if (normalized.length === 0) {
      throw new Error("UAZAPI retornou zero chats.");
    }

    const syncedChatJids = normalized.map((chat) => chat.chatJid);
    const missingAvatars = normalized.filter((chat) => !chat.avatarUrl).slice(0, AVATAR_ENRICH_LIMIT);
    await Promise.allSettled(
      missingAvatars.map(async (chat) => {
        chat.avatarUrl = await this.fetchMissingAvatarFromDetails(instanceToken, chat.chatJid);
      })
    );

    await this.repository.upsertMany(userId, normalized);
    await this.repository.deleteMissingByUser(userId, syncedChatJids);

    return normalized
      .sort((a, b) => Number(b.lastMessageTime || 0n) - Number(a.lastMessageTime || 0n))
      .map((chat) => ({
        id: chat.chatJid,
        chatJid: chat.chatJid,
        name: chat.name || "",
        pushName: chat.pushName || "",
        avatarUrl: chat.avatarUrl || "",
        isGroup: Boolean(chat.isGroup),
        isPinned: Boolean((chat.raw as any)?.wa_isPinned),
        lastMessage: chat.lastMessage || "",
        lastMessageTime: chat.lastMessageTime ? Number(chat.lastMessageTime) : 0,
        unreadCount: Number(chat.unreadCount || 0)
      }));
  }
}
