import { prisma } from "../lib/prisma";

export class CommunityBlockRepository {
  async listBlockerIds(blockerId: string): Promise<string[]> {
    const rows = await prisma.communityUserBlock.findMany({
      where: { blockerId },
      select: { blockedId: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => row.blockedId);
  }

  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new Error("Você não pode bloquear a si mesmo.");
    }

    const blockedUser = await prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true, role: true },
    });
    if (!blockedUser) throw new Error("Membro não encontrado.");

    return prisma.communityUserBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
  }
}
