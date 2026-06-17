import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { NotificationRepository } from "../repositories/notification.repository";
import { CheckInTemplateRepository } from "../repositories/checkin-template.repository";
import { getWeekStart } from "../utils/week-start";
import { isWeeklyCheckInWindowOpen } from "../utils/checkin-weekly-window";

const notificationRepository = new NotificationRepository();
const templateRepository = new CheckInTemplateRepository();

function dispatchSourceKey(periodKey: string, userId: string) {
  return `checkin-dispatch:${periodKey}:${userId}`;
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
