import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type UpsertContactStateInput = {
  contactJid: string;
  isSaved?: boolean;
  isBusiness?: boolean;
};

const normalizeJid = (value: string) => String(value || "").trim().toLowerCase();

export class WhatsappContactStateRepository {
  async listByUserAndJids(userId: string, jids: string[]) {
    const normalized = Array.from(new Set(jids.map(normalizeJid).filter(Boolean)));
    if (normalized.length === 0) return [];
    return prisma.whatsappContactState.findMany({
      where: {
        userId,
        contactJid: { in: normalized }
      }
    });
  }

  async upsertMany(userId: string, states: UpsertContactStateInput[]) {
    for (const state of states) {
      const contactJid = normalizeJid(state.contactJid);
      if (!contactJid) continue;

      const existing = await prisma.whatsappContactState.findUnique({
        where: {
          userId_contactJid: {
            userId,
            contactJid
          }
        }
      });

      await prisma.whatsappContactState.upsert({
        where: {
          userId_contactJid: {
            userId,
            contactJid
          }
        },
        update: {
          isSaved: Boolean(existing?.isSaved || state.isSaved),
          isBusiness: Boolean(existing?.isBusiness || state.isBusiness),
          lastCheckedAt: new Date()
        },
        create: {
          userId,
          contactJid,
          isSaved: Boolean(state.isSaved),
          isBusiness: Boolean(state.isBusiness),
          lastCheckedAt: new Date()
        }
      });
    }
  }
}
