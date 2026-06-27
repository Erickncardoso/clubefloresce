import { WhatsappMediaArchive } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type UpsertWhatsappMediaArchiveInput = {
  messageId: string;
  chatJid?: string | null;
  mimeType?: string | null;
  storageKey: string;
  publicUrl: string;
  sourceUrl?: string | null;
  sizeBytes?: number | null;
};

export class WhatsappMediaArchiveRepository {
  async findByUserAndMessage(userId: string, messageId: string): Promise<WhatsappMediaArchive | null> {
    return prisma.whatsappMediaArchive.findUnique({
      where: {
        userId_messageId: { userId, messageId },
      },
    });
  }

  async upsert(userId: string, input: UpsertWhatsappMediaArchiveInput): Promise<WhatsappMediaArchive> {
    return prisma.whatsappMediaArchive.upsert({
      where: {
        userId_messageId: {
          userId,
          messageId: input.messageId,
        },
      },
      update: {
        chatJid: input.chatJid ?? null,
        mimeType: input.mimeType ?? null,
        storageKey: input.storageKey,
        publicUrl: input.publicUrl,
        sourceUrl: input.sourceUrl ?? null,
        sizeBytes: input.sizeBytes ?? null,
      },
      create: {
        userId,
        messageId: input.messageId,
        chatJid: input.chatJid ?? null,
        mimeType: input.mimeType ?? null,
        storageKey: input.storageKey,
        publicUrl: input.publicUrl,
        sourceUrl: input.sourceUrl ?? null,
        sizeBytes: input.sizeBytes ?? null,
      },
    });
  }
}
