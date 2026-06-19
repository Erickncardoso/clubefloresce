import { prisma } from "../lib/prisma";

export type PushSubscriptionInput = {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
};

export class PushSubscriptionRepository {
  async upsert(input: PushSubscriptionInput) {
    return prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: input.userId,
          endpoint: input.endpoint,
        },
      },
      create: input,
      update: {
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  async deleteByEndpoint(userId: string, endpoint: string) {
    return prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  async listByUser(userId: string) {
    return prisma.pushSubscription.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async deleteById(userId: string, id: string) {
    return prisma.pushSubscription.deleteMany({
      where: { userId, id },
    });
  }

  async countByUser(userId: string) {
    return prisma.pushSubscription.count({ where: { userId } });
  }
}
