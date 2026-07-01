import { WhatsappChat } from "@prisma/client";
import { prisma } from "../lib/prisma";
export type UpsertWhatsappChatInput = {
  chatJid: string;
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

  async findByChatJid(userId: string, chatJid: string): Promise<WhatsappChat | null> {
    const normalized = String(chatJid || "").trim();
    if (!normalized) return null;

    const direct = await prisma.whatsappChat.findUnique({
      where: { userId_chatJid: { userId, chatJid: normalized } },
    });
    if (direct) return direct;

    const digits = normalized.split("@")[0]?.replace(/\D/g, "") || "";
    if (digits.length >= 8) {
      return prisma.whatsappChat.findUnique({
        where: { userId_chatJid: { userId, chatJid: `${digits}@s.whatsapp.net` } },
      });
    }

    return null;
  }
}
