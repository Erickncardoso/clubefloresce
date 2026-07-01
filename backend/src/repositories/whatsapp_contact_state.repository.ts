import { prisma } from "../lib/prisma";

type UpsertContactStateInput = {
  contactJid: string;
  isSaved?: boolean;
  isBusiness?: boolean;
  phone?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  details?: unknown;
  detailsSyncedAt?: Date | null;
};

const normalizeJid = (value: string) => String(value || "").trim().toLowerCase();

export class WhatsappContactStateRepository {
  async findByUserAndJid(userId: string, contactJid: string) {
    const normalized = normalizeJid(contactJid);
    if (!normalized) return null;
    return prisma.whatsappContactState.findUnique({
      where: {
        userId_contactJid: {
          userId,
          contactJid: normalized
        }
      }
    });
  }

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

  async upsertDetails(userId: string, state: UpsertContactStateInput) {
    const contactJid = normalizeJid(state.contactJid);
    if (!contactJid) return;

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
        isSaved: state.isSaved ?? existing?.isSaved ?? false,
        isBusiness: state.isBusiness ?? existing?.isBusiness ?? false,
        phone: state.phone ?? existing?.phone ?? null,
        displayName: state.displayName ?? existing?.displayName ?? null,
        avatarUrl: state.avatarUrl ?? existing?.avatarUrl ?? null,
        details: (state.details ?? existing?.details ?? undefined) as any,
        detailsSyncedAt: state.detailsSyncedAt ?? existing?.detailsSyncedAt ?? null,
        lastCheckedAt: new Date()
      },
      create: {
        userId,
        contactJid,
        isSaved: Boolean(state.isSaved),
        isBusiness: Boolean(state.isBusiness),
        phone: state.phone ?? null,
        displayName: state.displayName ?? null,
        avatarUrl: state.avatarUrl ?? null,
        details: (state.details ?? undefined) as any,
        detailsSyncedAt: state.detailsSyncedAt ?? null,
        lastCheckedAt: new Date()
      }
    });
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await prisma.whatsappContactState.deleteMany({ where: { userId } });
  }
}
