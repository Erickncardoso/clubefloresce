import { WhatsappMessage } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type UpsertWhatsappMessageInput = {
  chatJid: string;
  messageId: string;
  messageTimestamp: bigint;
  fromMe?: boolean;
  raw: unknown;
};

export class WhatsappMessageRepository {
  async upsertMany(userId: string, messages: UpsertWhatsappMessageInput[]): Promise<number> {
    if (!messages.length) return 0;

    let written = 0;
    for (const msg of messages) {
      if (!msg.messageId || !msg.chatJid) continue;
      await prisma.whatsappMessage.upsert({
        where: {
          userId_messageId: {
            userId,
            messageId: msg.messageId,
          },
        },
        update: {
          chatJid: msg.chatJid,
          messageTimestamp: msg.messageTimestamp,
          fromMe: Boolean(msg.fromMe),
          raw: msg.raw as any,
        },
        create: {
          userId,
          chatJid: msg.chatJid,
          messageId: msg.messageId,
          messageTimestamp: msg.messageTimestamp,
          fromMe: Boolean(msg.fromMe),
          raw: msg.raw as any,
        },
      });
      written += 1;
    }
    return written;
  }

  async listByChat(
    userId: string,
    chatJid: string,
    limit: number,
    offset: number,
  ): Promise<WhatsappMessage[]> {
    return this.listByChatAliases(userId, [chatJid], limit, offset);
  }

  async listByChatAliases(
    userId: string,
    chatJids: string[],
    limit: number,
    offset: number,
  ): Promise<WhatsappMessage[]> {
    const aliases = [...new Set(chatJids.map((jid) => String(jid || "").trim()).filter(Boolean))];
    if (!aliases.length) return [];

    const safeLimit = Math.min(200, Math.max(1, Math.floor(limit) || 50));
    const safeOffset = Math.max(0, Math.floor(offset) || 0);

    const rows = await prisma.whatsappMessage.findMany({
      where: { userId, chatJid: { in: aliases } },
      orderBy: { messageTimestamp: "desc" },
      skip: safeOffset,
      take: safeLimit,
    });

    return rows.reverse();
  }

  async countByChat(userId: string, chatJid: string): Promise<number> {
    return this.countByChatAliases(userId, [chatJid]);
  }

  async countByChatAliases(userId: string, chatJids: string[]): Promise<number> {
    const aliases = [...new Set(chatJids.map((jid) => String(jid || "").trim()).filter(Boolean))];
    if (!aliases.length) return 0;
    return prisma.whatsappMessage.count({
      where: { userId, chatJid: { in: aliases } },
    });
  }

  async getOldestMessage(userId: string, chatJid: string): Promise<WhatsappMessage | null> {
    return this.getOldestMessageByAliases(userId, [chatJid]);
  }

  async getOldestMessageByAliases(userId: string, chatJids: string[]): Promise<WhatsappMessage | null> {
    const aliases = [...new Set(chatJids.map((jid) => String(jid || "").trim()).filter(Boolean))];
    if (!aliases.length) return null;
    return prisma.whatsappMessage.findFirst({
      where: { userId, chatJid: { in: aliases } },
      orderBy: { messageTimestamp: "asc" },
    });
  }

  async countByUser(userId: string): Promise<number> {
    return prisma.whatsappMessage.count({ where: { userId } });
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await prisma.whatsappMessage.deleteMany({ where: { userId } });
  }
}

export const whatsappMessageRepository = new WhatsappMessageRepository();
