import { WhatsappChatRepository } from "../repositories/whatsapp_chat.repository";

import { isWuzapiProvider, resolveWhatsappDatastoreUserId } from "../config/whatsapp-provider.config";

import { WhatsappService } from "./whatsapp.service";

import whatsappSessionService from "./whatsapp-session.service";

import { chatNameLooksLikeBareJid } from "./wuzapi/wuzapi-mappers";



const METADATA_ENRICH_LIMIT = 25;

const AVATAR_ENRICH_LIMIT = 18;



type UazChat = Record<string, any>;



/** Normaliza timestamp de chat para ms (UI/DB). */
function normalizeChatListTimestampMs(value: unknown): number {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return num < 1_000_000_000_000 ? Math.floor(num * 1000) : Math.floor(num);
}

type WhatsappChatListRow = {

  id: string;

  chatJid: string;

  name: string;

  pushName: string;

  avatarUrl: string;

  isGroup: boolean;

  isPinned: boolean;

  lastMessage: string;

  lastMessageTime: number;

  unreadCount: number;

  raw: UazChat;

};



export class WhatsappChatSyncService {

  private readonly repository = new WhatsappChatRepository();

  private readonly whatsappService = new WhatsappService();



  private mapDbChatRow(chat: {

    chatJid: string;

    name?: string | null;

    pushName?: string | null;

    avatarUrl?: string | null;

    isGroup?: boolean;

    lastMessage?: string | null;

    lastMessageTime?: bigint | null;

    unreadCount?: number;

    raw?: unknown;

  }): WhatsappChatListRow {

    const raw = chat.raw && typeof chat.raw === "object" ? (chat.raw as Record<string, unknown>) : {};

    const lastMessageTime = normalizeChatListTimestampMs(chat.lastMessageTime);

    return {

      id: chat.chatJid,

      chatJid: chat.chatJid,

      name: chat.name || "",

      pushName: chat.pushName || "",

      avatarUrl: chat.avatarUrl || "",

      isGroup: Boolean(chat.isGroup),

      isPinned: Boolean(raw?.wa_isPinned),

      lastMessage: chat.lastMessage || "",

      lastMessageTime,

      unreadCount: Number(chat.unreadCount || 0),

      raw: raw as UazChat,

    };

  }



  private mapUazChatToListRow(chat: UazChat): WhatsappChatListRow | null {

    const chatJid = String(chat.wa_chatid || chat.chatid || chat.id || "").trim();

    if (!chatJid) return null;

    const lastMessageTime = normalizeChatListTimestampMs(
      chat.lastMessageTime || chat.timestamp || chat.wa_lastMsgTimestamp,
    );

    return {

      id: chatJid,

      chatJid,

      name: String(chat.name || chat.wa_name || ""),

      pushName: String(chat.wa_contactName || chat.wa_name || chat.name || ""),

      avatarUrl: String(chat.imagePreview || chat.image || chat.avatarUrl || ""),

      isGroup: Boolean(chat.wa_isGroup || chatJid.endsWith("@g.us")),

      isPinned: Boolean(chat.wa_isPinned),

      lastMessage: String(chat.wa_lastMsgText || chat.wa_lastMessageTextVote || ""),

      lastMessageTime,

      unreadCount: Number(chat.wa_unreadCount || 0),

      raw: chat,

    };

  }



  private dbRowToApiChat(row: WhatsappChatListRow): UazChat {

    return {

      ...row.raw,

      wa_chatid: row.chatJid,

      chatid: row.chatJid,

      id: row.chatJid,

      name: row.name,

      wa_name: row.name,

      wa_contactName: row.pushName || row.name,

      image: row.avatarUrl,

      imagePreview: row.avatarUrl,

      avatarUrl: row.avatarUrl,

      wa_isGroup: row.isGroup,

      wa_lastMsgText: row.lastMessage,

      wa_lastMessageTextVote: row.lastMessage,

      wa_lastMsgTimestamp: row.lastMessageTime > 0 ? Math.floor(row.lastMessageTime / 1000) : 0,

      lastMessageTime: row.lastMessageTime,

      wa_unreadCount: row.unreadCount,

    };

  }



  /** Cache rápido do Postgres — não chama WuzAPI. */

  async listCachedChats(userId: string): Promise<any[]> {

    const dataUserId = resolveWhatsappDatastoreUserId(userId);

    const cached = await this.repository.listByUser(dataUserId);

    return cached

      .filter((chat) => chat.lastMessageTime && Number(chat.lastMessageTime) > 0)

      .map((chat) => this.dbRowToApiChat(this.mapDbChatRow(chat)));

  }



  async syncAndList(userId: string, forceRefresh = false): Promise<any[]> {

    const dataUserId = resolveWhatsappDatastoreUserId(userId);

    try {

      const page = await this.whatsappService.findChats(userId, {

        limit: 1000,

        forceRefresh,

        forceLive: forceRefresh,

      });

      const chats = Array.isArray(page?.chats) ? page.chats : [];

      const rows: WhatsappChatListRow[] = chats

        .map((chat: UazChat) => this.mapUazChatToListRow(chat))

        .filter((row: WhatsappChatListRow | null): row is WhatsappChatListRow => Boolean(row));



      const needsEnrich = rows.some((chat) => {

        const jid = String(chat.chatJid || "").trim();

        const name = String(chat.name || "").trim();

        const avatar = String(chat.avatarUrl || "").trim();

        return !avatar || chatNameLooksLikeBareJid(name, jid);

      });



      if (needsEnrich) {

        const rawChats = rows.map((row) => row.raw);

        await this.whatsappService.batchEnrichChatsMetadata(userId, rawChats, {

          nameLimit: METADATA_ENRICH_LIMIT,

          avatarLimit: AVATAR_ENRICH_LIMIT,

        });

        for (let i = 0; i < rows.length; i += 1) {

          const raw = rawChats[i];

          if (!raw || typeof raw !== "object") continue;

          rows[i].name = String(raw.name || raw.wa_name || rows[i].name || "");

          rows[i].pushName = String(raw.wa_contactName || raw.wa_name || rows[i].pushName || rows[i].name || "");

          rows[i].avatarUrl = String(raw.imagePreview || raw.image || raw.avatarUrl || rows[i].avatarUrl || "");

        }

      }



      const sessionJid = await whatsappSessionService.getBoundSessionJid(dataUserId);

      // WuzAPI: sidebar 100% ao vivo — não gravar cache de chats no Postgres.
      if (rows.length && !isWuzapiProvider()) {

        await this.repository.upsertMany(

          dataUserId,

          rows.map((row) => ({

            chatJid: row.chatJid,

            sessionJid,

            name: row.name,

            pushName: row.pushName,

            avatarUrl: row.avatarUrl,

            isGroup: row.isGroup,

            lastMessage: row.lastMessage,

            lastMessageTime: row.lastMessageTime > 0 ? BigInt(row.lastMessageTime) : null,

            unreadCount: row.unreadCount,

            raw: row.raw,

          })),

        );

      }



      return rows

        .filter((chat) => Number(chat.lastMessageTime || 0) > 0)

        .sort((a, b) => Number(b.lastMessageTime || 0) - Number(a.lastMessageTime || 0))

        .map((row) => this.dbRowToApiChat(row));

    } catch (error: any) {

      console.warn("[WhatsApp] Falha ao buscar chats na WuzAPI:", error?.message || error);

      if (isWuzapiProvider()) return [];

      return this.listCachedChats(userId);

    }

  }

}

