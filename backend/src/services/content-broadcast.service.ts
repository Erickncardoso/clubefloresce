import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { NotificationRepository } from "../repositories/notification.repository";
import { isPatientAccessExpired } from "../utils/access-expires";
import { isVapidConfigured } from "../utils/vapid-config";

const notificationRepository = new NotificationRepository();

type BroadcastInput = {
  type: "content";
  title: string;
  body: string;
  actionPath: string;
  sourceKey: string;
};

async function listPushPatientIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: {
      role: Role.PACIENTE,
      status: UserStatus.ATIVO,
      pushSubscriptions: { some: {} },
    },
    select: {
      id: true,
      accessExpiresAt: true,
    },
  });

  return rows
    .filter((row) => !isPatientAccessExpired(row.accessExpiresAt))
    .map((row) => row.id);
}

/**
 * Avisa pacientes (com push ativa) sobre conteúdo novo da biblioteca.
 * Disparo em background — não bloqueia o save do admin.
 */
export class ContentBroadcastService {
  async notifyPatients(input: BroadcastInput): Promise<{ sent: number }> {
    if (!isVapidConfigured()) return { sent: 0 };

    const userIds = await listPushPatientIds();
    let sent = 0;

    for (const userId of userIds) {
      await notificationRepository.upsertBySourceKey({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        actionPath: input.actionPath,
        sourceKey: `${input.sourceKey}:${userId}`,
      });
      sent += 1;
    }

    if (sent > 0) {
      console.log(`[ContentPush] ${sent} aviso(s) enviados — ${input.sourceKey}`);
    }

    return { sent };
  }

  async notifyNewLesson(input: {
    lessonId: string;
    lessonTitle: string;
    courseId: string;
    courseTitle: string;
  }): Promise<void> {
    const lessonTitle = String(input.lessonTitle || "").trim() || "Nova aula";
    const courseTitle = String(input.courseTitle || "").trim() || "Biblioteca";

    await this.notifyPatients({
      type: "content",
      title: "Novo vídeo",
      body: `${lessonTitle} em ${courseTitle}.`,
      actionPath: `/modulos/${encodeURIComponent(input.courseId)}`,
      sourceKey: `lesson:${input.lessonId}`,
    });
  }

  async notifyNewEbook(input: { ebookId: string; title: string }): Promise<void> {
    const title = String(input.title || "").trim() || "Novo ebook";

    await this.notifyPatients({
      type: "content",
      title: "Novo ebook",
      body: `${title} disponível na biblioteca.`,
      actionPath: "/ebooks",
      sourceKey: `ebook:${input.ebookId}`,
    });
  }
}

export const contentBroadcastService = new ContentBroadcastService();

export function scheduleContentBroadcast(task: () => Promise<unknown>) {
  void task().catch((error) => {
    console.error("[ContentPush] Falha no broadcast:", error);
  });
}
