import { } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { dispatchPushToUser } from "../services/push-notification.service";

export type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  actionPath?: string | null;
  sourceKey?: string | null;
};

export class NotificationRepository {
  async listForUser(userId: string, limit = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async countUnread(userId: string) {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async upsertBySourceKey(input: CreateNotificationInput) {
    if (!input.sourceKey) {
      return prisma.notification.create({ data: input });
    }

    const notification = await prisma.notification.upsert({
      where: {
        userId_sourceKey: {
          userId: input.userId,
          sourceKey: input.sourceKey,
        },
      },
      create: input,
      update: {
        type: input.type,
        title: input.title,
        body: input.body,
        actionPath: input.actionPath ?? null,
        read: false,
      },
    });

    dispatchPushToUser(input.userId, {
      title: input.title,
      body: input.body,
      url: input.actionPath,
      tag: input.sourceKey || notification.id,
    });

    return notification;
  }

  async deleteBySourceKey(userId: string, sourceKey: string) {
    return prisma.notification.deleteMany({
      where: { userId, sourceKey },
    });
  }

  async markRead(userId: string, notificationId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
