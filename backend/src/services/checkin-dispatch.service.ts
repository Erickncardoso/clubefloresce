import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { NotificationRepository } from "../repositories/notification.repository";
import { CheckInTemplateRepository } from "../repositories/checkin-template.repository";
import { getWeekStart } from "../utils/week-start";
import { isWeeklyCheckInWindowOpen } from "../utils/checkin-weekly-window";
import { resolvePeriodKey } from "../utils/patient-local-date";

const notificationRepository = new NotificationRepository();
const templateRepository = new CheckInTemplateRepository();

function dispatchSourceKey(periodKey: string, userId: string) {
  return `checkin-dispatch:${periodKey}:${userId}`;
}

export function checkinInviteSourceKey(templateId: string, periodKey: string, userId: string) {
  return `checkin-invite:${templateId}:${periodKey}:${userId}`;
}

function parseUserIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((id) => String(id).trim()).filter(Boolean);
}

function parseScheduledAt(value: unknown): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (match) {
    const [, dateKey, hour, minute] = match;
    const parsed = new Date(`${dateKey}T${hour}:${minute}:00-03:00`);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date : null;
}

function parsePeriodDate(value: unknown): string | null {
  const trimmed = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export class CheckInDispatchService {
  async wasDispatchedForPeriod(periodKey: string): Promise<boolean> {
    const count = await prisma.notification.count({
      where: {
        sourceKey: { startsWith: `checkin-dispatch:${periodKey}:` },
      },
    });
    return count > 0;
  }

  async hasInvite(userId: string, templateId: string, periodKey: string): Promise<boolean> {
    const sourceKey = checkinInviteSourceKey(templateId, periodKey, userId);
    const count = await prisma.notification.count({
      where: { userId, sourceKey },
    });
    return count > 0;
  }

  async listInvitedTemplateIds(userId: string, periodKeys: Record<string, string>): Promise<Set<string>> {
    const keys = Object.entries(periodKeys).map(([templateId, periodKey]) =>
      checkinInviteSourceKey(templateId, periodKey, userId),
    );
    if (!keys.length) return new Set();

    const rows = await prisma.notification.findMany({
      where: { userId, sourceKey: { in: keys } },
      select: { sourceKey: true },
    });

    const invited = new Set<string>();
    for (const row of rows) {
      const parts = String(row.sourceKey || "").split(":");
      if (parts.length >= 2 && parts[0] === "checkin-invite") {
        invited.add(parts[1]);
      }
    }
    return invited;
  }

  private async resolveTargetUserIds(userIds?: string[] | null, allPatients?: boolean): Promise<string[]> {
    if (allPatients || !userIds?.length) {
      const patients = await prisma.user.findMany({
        where: { role: Role.PACIENTE },
        select: { id: true },
      });
      return patients.map((p) => p.id);
    }
    return userIds;
  }

  async sendTemplateInvites(options: {
    templateId: string;
    userIds: string[];
    periodDate?: string | null;
    title?: string | null;
    body?: string | null;
    skipCompleted?: boolean;
  }) {
    const template = await templateRepository.findById(options.templateId);
    if (!template || !template.active) {
      throw new Error("Check-in não encontrado ou inativo.");
    }

    const periodKey = resolvePeriodKey(template.frequency, options.periodDate || null);
    const title = String(options.title || "").trim() || template.title;
    const body =
      String(options.body || "").trim() ||
      `Você tem um check-in pendente: ${template.title}. Toque para responder.`;

    let sent = 0;
    let skipped = 0;

    for (const userId of options.userIds) {
      if (options.skipCompleted) {
        const existing = await templateRepository.findResponse(userId, template.id, periodKey);
        if (existing) {
          skipped += 1;
          continue;
        }
      }

      await notificationRepository.upsertBySourceKey({
        userId,
        type: "checkin",
        title,
        body,
        actionPath: "/check-in",
        sourceKey: checkinInviteSourceKey(template.id, periodKey, userId),
      });
      sent += 1;
    }

    return {
      sent,
      skipped,
      periodKey,
      templateId: template.id,
      templateTitle: template.title,
      message: sent
        ? `Check-in enviado para ${sent} aluna${sent === 1 ? "" : "s"}.`
        : "Nenhuma aluna pendente para este período.",
    };
  }

  async dispatchWeeklyToAllPatients(options: { force?: boolean } = {}) {
    const periodKey = getWeekStart().toISOString();

    if (!options.force && !(await isWeeklyCheckInWindowOpen())) {
      throw new Error("O disparo automático só ocorre entre sexta 11h e segunda-feira.");
    }

    if (!options.force && (await this.wasDispatchedForPeriod(periodKey))) {
      return {
        periodKey,
        skipped: true,
        sent: 0,
        message: "Check-in já foi disparado para esta semana.",
      };
    }

    const patients = await prisma.user.findMany({
      where: { role: Role.PACIENTE },
      select: { id: true, name: true },
    });

    const activeTemplates = await templateRepository.findActiveForPatients();
    const weeklyTemplates = activeTemplates.filter((tpl) => tpl.frequency === "weekly");
    const templateIds = weeklyTemplates.map((tpl) => tpl.id);

    let sent = 0;

    for (const patient of patients) {
      if (templateIds.length) {
        const responses = await prisma.checkInResponse.findMany({
          where: {
            userId: patient.id,
            templateId: { in: templateIds },
            periodKey,
          },
          select: { id: true },
        });
        if (responses.length >= templateIds.length) continue;
      }

      await notificationRepository.upsertBySourceKey({
        userId: patient.id,
        type: "checkin",
        title: "Check-in semanal",
        body: "Chegou a hora do seu check-in! Preencha até segunda-feira para manter sua evolução em dia.",
        actionPath: "/check-in",
        sourceKey: dispatchSourceKey(periodKey, patient.id),
      });
      sent += 1;
    }

    return {
      periodKey,
      skipped: false,
      sent,
      totalPatients: patients.length,
      message: sent
        ? `Check-in enviado para ${sent} paciente${sent === 1 ? "" : "s"}.`
        : "Nenhuma paciente pendente — todas já responderam.",
    };
  }

  async createCustomDispatch(authorId: string, body: Record<string, unknown>) {
    const templateId = String(body.templateId || "").trim();
    if (!templateId) throw new Error("Selecione um tipo de check-in.");

    const allPatients = Boolean(body.allPatients);
    const userIds = parseUserIds(body.userIds);
    if (!allPatients && !userIds.length) {
      throw new Error("Selecione pelo menos uma aluna ou marque todas.");
    }

    const periodDate = parsePeriodDate(body.periodDate);
    const scheduledAt = parseScheduledAt(body.scheduledAt);
    const title = body.title != null ? String(body.title) : null;
    const messageBody = body.body != null ? String(body.body) : null;

    const targetUserIds = await this.resolveTargetUserIds(userIds, allPatients);

    if (scheduledAt && scheduledAt.getTime() > Date.now() + 30_000) {
      const schedule = await prisma.checkInDispatchSchedule.create({
        data: {
          templateId,
          userIds: allPatients ? [] : userIds,
          periodDate,
          scheduledAt,
          status: "pending",
          title: title?.trim() || null,
          body: messageBody?.trim() || null,
          authorId,
        },
      });

      return {
        scheduled: true,
        scheduleId: schedule.id,
        scheduledAt: schedule.scheduledAt.toISOString(),
        message: `Disparo programado para ${schedule.scheduledAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`,
      };
    }

    const result = await this.sendTemplateInvites({
      templateId,
      userIds: targetUserIds,
      periodDate,
      title,
      body: messageBody,
      skipCompleted: true,
    });

    return { scheduled: false, ...result };
  }

  async listSchedules(authorId: string) {
    const schedules = await prisma.checkInDispatchSchedule.findMany({
      where: { authorId, status: "pending" },
      orderBy: { scheduledAt: "asc" },
      include: {
        template: { select: { id: true, title: true, frequency: true } },
      },
    });

    return schedules.map((row) => ({
      id: row.id,
      templateId: row.templateId,
      templateTitle: row.template?.title || "Check-in",
      frequency: row.template?.frequency || "weekly",
      userIds: parseUserIds(row.userIds),
      allPatients: parseUserIds(row.userIds).length === 0,
      periodDate: row.periodDate,
      scheduledAt: row.scheduledAt.toISOString(),
      title: row.title,
      body: row.body,
      status: row.status,
    }));
  }

  async cancelSchedule(authorId: string, scheduleId: string) {
    const existing = await prisma.checkInDispatchSchedule.findFirst({
      where: { id: scheduleId, authorId, status: "pending" },
    });
    if (!existing) throw new Error("Agendamento não encontrado.");

    await prisma.checkInDispatchSchedule.update({
      where: { id: scheduleId },
      data: { status: "cancelled" },
    });

    return { ok: true, message: "Agendamento cancelado." };
  }

  async processScheduledDispatches() {
    const due = await prisma.checkInDispatchSchedule.findMany({
      where: {
        status: "pending",
        scheduledAt: { lte: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
      take: 20,
    });

    let processed = 0;

    for (const row of due) {
      if (!row.templateId) {
        await prisma.checkInDispatchSchedule.update({
          where: { id: row.id },
          data: { status: "cancelled" },
        });
        continue;
      }

      const userIds = parseUserIds(row.userIds);
      const allPatients = userIds.length === 0;
      const targetUserIds = await this.resolveTargetUserIds(userIds, allPatients);

      try {
        await this.sendTemplateInvites({
          templateId: row.templateId,
          userIds: targetUserIds,
          periodDate: row.periodDate,
          title: row.title,
          body: row.body,
          skipCompleted: true,
        });

        await prisma.checkInDispatchSchedule.update({
          where: { id: row.id },
          data: { status: "sent", sentAt: new Date() },
        });
        processed += 1;
      } catch (error) {
        console.error("[CheckIn] Falha no disparo programado:", row.id, error);
      }
    }

    return { processed };
  }

  async subscribeReminder(userId: string) {
    const periodKey = getWeekStart().toISOString();
    await notificationRepository.upsertBySourceKey({
      userId,
      type: "checkin",
      title: "Lembrete de check-in",
      body: "Te avisamos até segunda-feira para você não esquecer o check-in semanal.",
      actionPath: "/check-in",
      sourceKey: `checkin-reminder:${periodKey}:${userId}`,
    });
    return { ok: true };
  }
}
