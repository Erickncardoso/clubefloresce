import { prisma } from "../lib/prisma";
import { NotificationRepository } from "../repositories/notification.repository";
import { getWeekStart } from "../utils/week-start";


const repo = new NotificationRepository();

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export class NotificationService {
  async syncForUser(userId: string) {
    const weekStart = getWeekStart();
    const weekKey = weekStart.toISOString().slice(0, 10);

    const currentCheckIn = await prisma.weeklyCheckIn.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
    });

    if (!currentCheckIn) {
      await repo.upsertBySourceKey({
        userId,
        type: "checkin",
        title: "Check-in",
        body: "Não esqueça de completar seu check-in semanal.",
        actionPath: "/check-in",
        sourceKey: `checkin:${weekKey}`,
      });
    } else {
      await repo.deleteBySourceKey(userId, `checkin:${weekKey}`);
    }

    const recentCheckIns = await prisma.weeklyCheckIn.findMany({
      where: { userId },
      orderBy: { weekStart: "desc" },
      take: 4,
    });

    let consecutiveWeeks = 0;
    for (let index = 0; index < 4; index += 1) {
      const expectedWeek = new Date(weekStart);
      expectedWeek.setUTCDate(expectedWeek.getUTCDate() - 7 * index);
      const expectedKey = getWeekStart(expectedWeek).toISOString();
      const found = recentCheckIns.some(
        (entry) => entry.weekStart.toISOString() === expectedKey,
      );
      if (!found) break;
      consecutiveWeeks += 1;
    }

    if (consecutiveWeeks >= 4) {
      await repo.upsertBySourceKey({
        userId,
        type: "checkin",
        title: "Check-in",
        body: "Parabéns! Você completou 4 semanas seguidas.",
        actionPath: "/check-in",
        sourceKey: `checkin-streak:${weekKey}`,
      });
    }

    const recentBella = await prisma.bellaMessage.findFirst({
      where: {
        userId,
        role: "assistant",
        createdAt: { gte: daysAgo(2) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentBella) {
      const topic = recentBella.topic || "general";
      await repo.upsertBySourceKey({
        userId,
        type: "bella",
        title: "BELLA",
        body: "Nova dica personalizada para você!",
        actionPath: `/bella/chat/${topic}`,
        sourceKey: `bella:${recentBella.id}`,
      });
    }

    const recentComment = await prisma.comment.findFirst({
      where: {
        postId: { not: null },
        authorId: { not: userId },
        createdAt: { gte: daysAgo(7) },
        post: { authorId: userId },
      },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true } },
      },
    });

    if (recentComment) {
      const authorName = recentComment.author?.name?.split(" ")?.[0] || "Alguém";
      await repo.upsertBySourceKey({
        userId,
        type: "community",
        title: "Comunidade",
        body: `${authorName} comentou na sua publicação.`,
        actionPath: "/comunidade",
        sourceKey: `comment:${recentComment.id}`,
      });
    }

    const recentLesson = await prisma.lesson.findFirst({
      where: {
        module: {
          course: {
            createdAt: { gte: daysAgo(14) },
          },
        },
        NOT: {
          progress: {
            some: {
              userId,
              watched: true,
            },
          },
        },
      },
      orderBy: {
        module: {
          course: {
            createdAt: "desc",
          },
        },
      },
      include: {
        module: {
          include: {
            course: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (recentLesson?.module?.course) {
      await repo.upsertBySourceKey({
        userId,
        type: "content",
        title: "Novo conteúdo",
        body: `Novo conteúdo em ${recentLesson.module.course.title}.`,
        actionPath: `/modulos/${recentLesson.module.course.id}`,
        sourceKey: `lesson:${recentLesson.id}`,
      });
    }
  }

  async listForUser(userId: string) {
    await this.syncForUser(userId);
    const items = await repo.listForUser(userId);
    const unreadCount = await repo.countUnread(userId);
    return { items, unreadCount };
  }

  async markRead(userId: string, notificationId: string) {
    const result = await repo.markRead(userId, notificationId);
    if (!result.count) {
      throw new Error("Notificação não encontrada.");
    }
    return repo.countUnread(userId);
  }

  async markAllRead(userId: string) {
    await repo.markAllRead(userId);
    return 0;
  }
}
