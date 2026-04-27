import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class WhatsappGroupObservedSendersRepository {
  async getByUserAndGroup(userId: string, groupJid: string): Promise<Record<string, string>> {
    const row = await prisma.whatsappGroupObservedSenders.findUnique({
      where: { userId_groupJid: { userId, groupJid } }
    });
    if (!row?.data) return {};
    return (row.data as Record<string, string>) ?? {};
  }

  /** Mescla patch no JSON existente (valores não vazios). */
  async mergePatch(userId: string, groupJid: string, patch: Record<string, string>): Promise<void> {
    const prev = await this.getByUserAndGroup(userId, groupJid);
    const next: Record<string, string> = { ...prev };
    for (const [k, v] of Object.entries(patch)) {
      const val = String(v ?? "").trim();
      if (!val) continue;
      next[k] = val;
    }
    await prisma.whatsappGroupObservedSenders.upsert({
      where: { userId_groupJid: { userId, groupJid } },
      update: { data: next },
      create: { userId, groupJid, data: next }
    });
  }
}
