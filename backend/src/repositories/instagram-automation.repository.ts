import { prisma } from "../lib/prisma";
import type { InstagramAutomation, InstagramFollowup, Prisma } from "@prisma/client";

export type AutomationWithFollowups = InstagramAutomation & { followups: InstagramFollowup[] };

export class InstagramAutomationRepository {
  async listByUser(userId: string): Promise<AutomationWithFollowups[]> {
    return prisma.instagramAutomation.findMany({
      where: { userId },
      include: { followups: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async listActiveByUser(userId: string): Promise<AutomationWithFollowups[]> {
    return prisma.instagramAutomation.findMany({
      where: { userId, active: true },
      include: { followups: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async findById(id: string, userId: string): Promise<AutomationWithFollowups | null> {
    return prisma.instagramAutomation.findFirst({
      where: { id, userId },
      include: { followups: { orderBy: { sortOrder: "asc" } } },
    });
  }

  async create(
    userId: string,
    data: Omit<Prisma.InstagramAutomationUncheckedCreateInput, "userId" | "id">,
    followups: Array<Omit<Prisma.InstagramFollowupUncheckedCreateInput, "automationId" | "id">>
  ): Promise<AutomationWithFollowups> {
    return prisma.instagramAutomation.create({
      data: {
        ...data,
        userId,
        followups: { create: followups },
      },
      include: { followups: { orderBy: { sortOrder: "asc" } } },
    });
  }

  async update(
    id: string,
    userId: string,
    data: Omit<Prisma.InstagramAutomationUncheckedUpdateInput, "userId" | "id">,
    followups?: Array<Omit<Prisma.InstagramFollowupUncheckedCreateInput, "automationId" | "id">>
  ): Promise<AutomationWithFollowups | null> {
    const existing = await prisma.instagramAutomation.findFirst({ where: { id, userId } });
    if (!existing) return null;

    return prisma.$transaction(async (tx) => {
      if (followups) {
        await tx.instagramFollowup.deleteMany({ where: { automationId: id } });
      }
      return tx.instagramAutomation.update({
        where: { id },
        data: {
          ...data,
          ...(followups ? { followups: { create: followups } } : {}),
        },
        include: { followups: { orderBy: { sortOrder: "asc" } } },
      });
    });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await prisma.instagramAutomation.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }
}
