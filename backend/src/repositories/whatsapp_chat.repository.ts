import { WhatsappChat } from "@prisma/client";
import { prisma } from "../lib/prisma";
export type UpsertWhatsappChatInput = {
  chatJid: string;
  sessionJid?: string | null;
  name?: string;
  pushName?: string;
  avatarUrl?: string;
  isGroup?: boolean;
  lastMessage?: string;
  lastMessageTime?: bigint | null;
  unreadCount?: number;
  raw?: any;
};

export class WhatsappChatRepository {
  async upsertMany(userId: string, chats: UpsertWhatsappChatInput[]): Promise<void> {
    for (const chat of chats) {
      await prisma.whatsappChat.upsert({
        where: {
          userId_chatJid: {
            userId,
            chatJid: chat.chatJid
          }
        },
        update: {
          sessionJid: chat.sessionJid ?? undefined,
          name: chat.name ?? null,
          pushName: chat.pushName ?? null,
          avatarUrl: chat.avatarUrl ?? null,
          isGroup: Boolean(chat.isGroup),
          lastMessage: chat.lastMessage ?? null,
          lastMessageTime: chat.lastMessageTime ?? null,
          unreadCount: chat.unreadCount ?? 0,
          raw: chat.raw ?? null
        },
        create: {
          userId,
          chatJid: chat.chatJid,
          sessionJid: chat.sessionJid ?? null,
          name: chat.name ?? null,
          pushName: chat.pushName ?? null,
          avatarUrl: chat.avatarUrl ?? null,
          isGroup: Boolean(chat.isGroup),
          lastMessage: chat.lastMessage ?? null,
          lastMessageTime: chat.lastMessageTime ?? null,
          unreadCount: chat.unreadCount ?? 0,
          raw: chat.raw ?? null
        }
      });
    }
  }

  async listByUser(userId: string): Promise<WhatsappChat[]> {
    return prisma.whatsappChat.findMany({
      where: { userId },
      orderBy: [{ lastMessageTime: "desc" }, { updatedAt: "desc" }]
    });
  }

  async deleteMissingByUser(userId: string, keepChatJids: string[]): Promise<void> {
    await prisma.whatsappChat.deleteMany({
      where: {
        userId,
        chatJid: {
          notIn: keepChatJids.length > 0 ? keepChatJids : ["__none__"]
        }
      }
    });
  }

  async deleteByChatJid(userId: string, chatJid: string): Promise<void> {
    const normalized = String(chatJid || "").trim();
    if (!normalized) return;

    const digits = normalized.split("@")[0]?.replace(/\D/g, "") || "";
    const jids = new Set<string>([normalized]);
    if (digits.length >= 8) {
      jids.add(`${digits}@s.whatsapp.net`);
    }
    if (normalized.endsWith("@g.us")) {
      jids.add(normalized);
    }

    await prisma.whatsappChat.deleteMany({
      where: {
        userId,
        chatJid: { in: Array.from(jids) },
      },
    });
  }

  async upsertFromDetails(userId: string, chat: UpsertWhatsappChatInput): Promise<void> {
    if (!chat.chatJid) return;
    await prisma.whatsappChat.upsert({
      where: {
        userId_chatJid: {
          userId,
          chatJid: chat.chatJid
        }
      },
      update: {
        name: chat.name ?? undefined,
        pushName: chat.pushName ?? undefined,
        avatarUrl: chat.avatarUrl ?? undefined,
        isGroup: Boolean(chat.isGroup),
        raw: chat.raw ?? undefined
      },
      create: {
        userId,
        chatJid: chat.chatJid,
        name: chat.name ?? null,
        pushName: chat.pushName ?? null,
        avatarUrl: chat.avatarUrl ?? null,
        isGroup: Boolean(chat.isGroup),
        raw: chat.raw ?? null
      }
    });
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await prisma.whatsappChat.deleteMany({ where: { userId } });
  }

  async deleteNotMatchingSession(userId: string, sessionJid: string): Promise<number> {
    const scopedSession = String(sessionJid || "").trim().toLowerCase();
    if (!scopedSession) return 0;
    const result = await prisma.whatsappChat.deleteMany({
      where: {
        userId,
        OR: [
          { sessionJid: null },
          { sessionJid: { not: scopedSession } },
        ],
      },
    });
    return result.count;
  }

  async assignSessionJidToOrphans(userId: string, sessionJid: string): Promise<number> {
    const scopedSession = String(sessionJid || "").trim().toLowerCase();
    if (!scopedSession) return 0;
    const result = await prisma.whatsappChat.updateMany({
      where: { userId, sessionJid: null },
      data: { sessionJid: scopedSession },
    });
    return result.count;
  }

  /** Remove linhas de contato importadas por engano (sem conversa). */
  async deleteWithoutConversation(userId: string): Promise<void> {
    await prisma.whatsappChat.deleteMany({
      where: {
        userId,
        OR: [
          { lastMessage: null },
          { lastMessage: "" },
          { lastMessageTime: null },
        ],
      },
    });
  }

  async findByChatJid(userId: string, chatJid: string): Promise<WhatsappChat | null> {
    const normalized = String(chatJid || "").trim().toLowerCase();
    if (!normalized) return null;

    const direct = await prisma.whatsappChat.findUnique({
      where: { userId_chatJid: { userId, chatJid: normalized } },
    });
    if (direct) return direct;

    // Também tenta o JID original (case) — alguns rows antigos não estão lowercased.
    if (normalized !== String(chatJid || "").trim()) {
      const exact = await prisma.whatsappChat.findUnique({
        where: { userId_chatJid: { userId, chatJid: String(chatJid || "").trim() } },
      });
      if (exact) return exact;
    }

    const digits = normalized.split("@")[0]?.replace(/\D/g, "") || "";
    if (digits.length >= 8 && normalized.endsWith("@s.whatsapp.net")) {
      return prisma.whatsappChat.findUnique({
        where: { userId_chatJid: { userId, chatJid: `${digits}@s.whatsapp.net` } },
      });
    }

    // LID: procura chat cujo raw contém este wa_chatlid.
    if (normalized.endsWith("@lid")) {
      const rows = await prisma.whatsappChat.findMany({
        where: { userId },
        take: 500,
        orderBy: { updatedAt: "desc" },
      });
      for (const row of rows) {
        const raw = row.raw && typeof row.raw === "object" && !Array.isArray(row.raw)
          ? (row.raw as Record<string, unknown>)
          : {};
        const lidCandidates = [
          raw.wa_chatlid,
          raw.chatlid,
          raw.chatLid,
          raw.wa_fastid,
        ].map((v) => String(v || "").trim().toLowerCase());
        if (lidCandidates.includes(normalized)) return row;
        if (String(row.chatJid || "").trim().toLowerCase() === normalized) return row;
      }
    }

    return null;
  }

  /** Atualiza preview da sidebar só se a mensagem for mais recente que o cache. */
  async upsertLastMessageIfNewer(
    userId: string,
    chat: UpsertWhatsappChatInput,
  ): Promise<void> {
    if (!chat.chatJid) return;
    const existing = await this.findByChatJid(userId, chat.chatJid);
    const nextTs = chat.lastMessageTime ? Number(chat.lastMessageTime) : 0;
    const prevTs = existing?.lastMessageTime ? Number(existing.lastMessageTime) : 0;
    if (existing && nextTs > 0 && prevTs > nextTs) return;

    await this.upsertMany(userId, [{
      chatJid: chat.chatJid,
      sessionJid: chat.sessionJid ?? existing?.sessionJid ?? null,
      name: chat.name ?? existing?.name ?? undefined,
      pushName: chat.pushName ?? existing?.pushName ?? undefined,
      avatarUrl: chat.avatarUrl ?? existing?.avatarUrl ?? undefined,
      isGroup: chat.isGroup ?? existing?.isGroup ?? false,
      lastMessage: chat.lastMessage ?? existing?.lastMessage ?? undefined,
      lastMessageTime: chat.lastMessageTime ?? existing?.lastMessageTime ?? null,
      unreadCount: chat.unreadCount ?? existing?.unreadCount ?? 0,
      raw: chat.raw ?? existing?.raw ?? undefined,
    }]);
  }
}
