import { PrismaClient, WhatsappChat } from "@prisma/client";

const prisma = new PrismaClient();

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
}
