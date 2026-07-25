import { WhatsappMessage } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { normalizeWhatsappSessionJid } from "../services/whatsapp-session.service";

export type UpsertWhatsappMessageInput = {
  chatJid: string;
  messageId: string;
  messageTimestamp: bigint;
  fromMe?: boolean;
  sessionJid?: string | null;
  raw: unknown;
};

const UPSERT_CHUNK_SIZE = 40;

export class WhatsappMessageRepository {
  async upsertMany(userId: string, messages: UpsertWhatsappMessageInput[]): Promise<number> {
    if (!messages.length) return 0;

    const valid = messages.filter((msg) => msg.messageId && msg.chatJid);
    if (!valid.length) return 0;

    let written = 0;
    for (let i = 0; i < valid.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = valid.slice(i, i + UPSERT_CHUNK_SIZE);
      await prisma.$transaction(
        chunk.map((msg) =>
          prisma.whatsappMessage.upsert({
            where: {
              userId_messageId: {
                userId,
                messageId: msg.messageId,
              },
            },
            update: {
              chatJid: msg.chatJid,
              sessionJid: msg.sessionJid ?? null,
              messageTimestamp: msg.messageTimestamp,
              fromMe: Boolean(msg.fromMe),
              raw: msg.raw as any,
            },
            create: {
              userId,
              chatJid: msg.chatJid,
              sessionJid: msg.sessionJid ?? null,
              messageId: msg.messageId,
              messageTimestamp: msg.messageTimestamp,
              fromMe: Boolean(msg.fromMe),
              raw: msg.raw as any,
            },
          }),
        ),
      );
      written += chunk.length;
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
    sessionJid?: string | null,
  ): Promise<WhatsappMessage[]> {
    const aliases = [...new Set(chatJids.map((jid) => String(jid || "").trim()).filter(Boolean))];
    if (!aliases.length) return [];

    const safeLimit = Math.min(200, Math.max(1, Math.floor(limit) || 50));
    const safeOffset = Math.max(0, Math.floor(offset) || 0);
    const scopedSession = sessionJid ? normalizeWhatsappSessionJid(sessionJid) : "";

    const rows = await prisma.whatsappMessage.findMany({
      where: {
        userId,
        chatJid: { in: aliases },
        ...(scopedSession
          ? { sessionJid: scopedSession }
          : {}),
      },
      orderBy: { messageTimestamp: "desc" },
      skip: safeOffset,
      take: safeLimit,
    });

    return rows.reverse();
  }

  async countByChat(userId: string, chatJid: string): Promise<number> {
    return this.countByChatAliases(userId, [chatJid]);
  }

  async countByChatAliases(userId: string, chatJids: string[], sessionJid?: string | null): Promise<number> {
    const aliases = [...new Set(chatJids.map((jid) => String(jid || "").trim()).filter(Boolean))];
    if (!aliases.length) return 0;
    const scopedSession = sessionJid ? normalizeWhatsappSessionJid(sessionJid) : "";
    return prisma.whatsappMessage.count({
      where: {
        userId,
        chatJid: { in: aliases },
        ...(scopedSession
          ? { sessionJid: scopedSession }
          : {}),
      },
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

  /** Remove mensagens de outra conta WhatsApp (sessionJid ausente ou diferente). */
  async deleteNotMatchingSession(userId: string, sessionJid: string): Promise<number> {
    const scopedSession = normalizeWhatsappSessionJid(sessionJid);
    if (!scopedSession) return 0;
    const result = await prisma.whatsappMessage.deleteMany({
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

  /** Marca mensagens órfãs (ingest antes do bind) com a sessão atual. */
  async assignSessionJidToOrphans(userId: string, sessionJid: string): Promise<number> {
    const scopedSession = normalizeWhatsappSessionJid(sessionJid);
    if (!scopedSession) return 0;
    const result = await prisma.whatsappMessage.updateMany({
      where: { userId, sessionJid: null },
      data: { sessionJid: scopedSession },
    });
    return result.count;
  }

  /** Última mensagem de cada chat (para sidebar de conversas). */
  async listConversationSummaries(
    userId: string,
    limit = 500,
    sessionJid?: string | null,
  ): Promise<Array<{
    chatJid: string;
    messageTimestamp: bigint;
    fromMe: boolean;
    raw: unknown;
  }>> {
    const safeLimit = Math.min(1000, Math.max(1, Math.floor(limit) || 500));
    const scopedSession = sessionJid ? normalizeWhatsappSessionJid(sessionJid) : "";
    if (scopedSession) {
      const rows = await prisma.$queryRaw<Array<{
        chatJid: string;
        messageTimestamp: bigint;
        fromMe: boolean;
        raw: unknown;
      }>>`
        SELECT DISTINCT ON ("chatJid")
          "chatJid",
          "messageTimestamp",
          "fromMe",
          raw
        FROM "WhatsappMessage"
        WHERE "userId" = ${userId}
          AND "sessionJid" = ${scopedSession}
        ORDER BY "chatJid", "messageTimestamp" DESC
        LIMIT ${safeLimit}
      `;
      return rows || [];
    }

    const rows = await prisma.$queryRaw<Array<{
      chatJid: string;
      messageTimestamp: bigint;
      fromMe: boolean;
      raw: unknown;
    }>>`
      SELECT DISTINCT ON ("chatJid")
        "chatJid",
        "messageTimestamp",
        "fromMe",
        raw
      FROM "WhatsappMessage"
      WHERE "userId" = ${userId}
      ORDER BY "chatJid", "messageTimestamp" DESC
      LIMIT ${safeLimit}
    `;
    return rows || [];
  }
}

export const whatsappMessageRepository = new WhatsappMessageRepository();
