import { prisma } from "../lib/prisma";
import type { InstagramContact } from "@prisma/client";

export class InstagramContactRepository {
  async upsert(data: {
    userId: string;
    instagramScopedId: string;
    username?: string | null;
    lastAutomationId?: string | null;
  }): Promise<InstagramContact> {
    return prisma.instagramContact.upsert({
      where: { instagramScopedId: data.instagramScopedId },
      create: {
        userId: data.userId,
        instagramScopedId: data.instagramScopedId,
        username: data.username ?? null,
        lastAutomationId: data.lastAutomationId ?? null,
      },
      update: {
        ...(data.username ? { username: data.username } : {}),
        ...(data.lastAutomationId ? { lastAutomationId: data.lastAutomationId } : {}),
      },
    });
  }

  async markReplied(instagramScopedId: string, automationId?: string | null): Promise<void> {
    await prisma.instagramContact.updateMany({
      where: { instagramScopedId },
      data: {
        lastReplyAt: new Date(),
        ...(automationId ? { lastAutomationId: automationId } : {}),
      },
    });
  }

  async findByScopedId(instagramScopedId: string): Promise<InstagramContact | null> {
    return prisma.instagramContact.findUnique({ where: { instagramScopedId } });
  }
}
