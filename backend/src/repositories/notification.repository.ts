import { } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { dispatchPushToUser } from "../services/push-notification.service";

export type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  actionPath?: string | null;
  imageUrl?: string | null;
  sourceKey?: string | null;
  /** Texto curto na push (se diferente do body salvo no app). */
  pushBody?: string | null;
  /** Itens extras — subtitle iOS ao expandir a notificação. */
  pushSubtitle?: string | null;
};

function pushPayload(input: CreateNotificationInput, tag: string) {
  return {
    title: input.title,
    body: input.pushBody?.trim() || input.body,
    subtitle: input.pushSubtitle?.trim() || null,
    url: input.actionPath,
    tag,
    type: input.type,
    categoryId: input.type === "meal" ? "meal-reminder" : null,
  };
}

function dbData(input: CreateNotificationInput) {
  return {
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    actionPath: input.actionPath ?? null,
    imageUrl: input.imageUrl ?? null,
    sourceKey: input.sourceKey ?? null,
  };
}

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

  async createWithoutPush(input: CreateNotificationInput) {
    return prisma.notification.create({ data: dbData(input) });
  }

  async upsertBySourceKey(input: CreateNotificationInput) {
    if (!input.sourceKey) {
      const notification = await prisma.notification.create({ data: dbData(input) });
      dispatchPushToUser(input.userId, pushPayload(input, notification.id));
      return notification;
    }

    const existing = await prisma.notification.findUnique({
      where: {
        userId_sourceKey: {
          userId: input.userId,
          sourceKey: input.sourceKey,
        },
      },
    });

    if (!existing) {
      const notification = await prisma.notification.create({ data: dbData(input) });
      dispatchPushToUser(input.userId, pushPayload(input, input.sourceKey));
      return notification;
    }

    const contentChanged =
      existing.title !== input.title
      || existing.body !== input.body
      || existing.type !== input.type;

    const pathChanged = (existing.actionPath ?? null) !== (input.actionPath ?? null);

    if (!contentChanged && !pathChanged) {
      return existing;
    }

    const notification = await prisma.notification.update({
      where: { id: existing.id },
      data: {
        type: input.type,
        title: input.title,
        body: input.body,
        actionPath: input.actionPath ?? null,
        // Só reabre como não-lida se o texto mudou (não só o deep link)
        ...(contentChanged ? { read: false } : {}),
      },
    });

    // Evita 2º push só porque o mealId da opção ativa mudou
    if (contentChanged) {
      dispatchPushToUser(input.userId, pushPayload(input, input.sourceKey!));
    }

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
