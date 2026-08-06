import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { NotificationRepository } from "../repositories/notification.repository";
import type { PatientProfileData } from "../types/patient-profile.types";
import { isPatientAccessExpired } from "../utils/access-expires";
import { getLocalMinutesInTimeZone } from "../utils/patient-local-clock";
import { getDateKeyInTimeZone } from "../utils/patient-timezone";
import { isVapidConfigured } from "../utils/vapid-config";
import {
  isMealRemindersEnabled,
  resolvePatientTimezone,
} from "./patient-preferences.service";

const notificationRepository = new NotificationRepository();

/** Meio-dia e 20h no fuso da paciente (janela de 2 min como as refeições). */
const GOAL_REMINDER_HOURS = [12, 20] as const;
const CATCH_UP_MINUTES = 2;

type PatientGoalLike = {
  id?: string;
  frequency?: string;
};

type GoalsPayload = {
  goals: PatientGoalLike[];
  progress: Record<string, unknown>;
};

function asProfile(value: unknown): PatientProfileData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as PatientProfileData;
}

function asGoalsPayload(value: unknown): GoalsPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { goals: [], progress: {} };
  }
  const data = value as Record<string, unknown>;
  return {
    goals: Array.isArray(data.goals) ? (data.goals as PatientGoalLike[]) : [],
    progress: data.progress && typeof data.progress === "object" && !Array.isArray(data.progress)
      ? (data.progress as Record<string, unknown>)
      : {},
  };
}

function isGoalReminderHour(localMinutes: number): number | null {
  for (const hour of GOAL_REMINDER_HOURS) {
    const start = hour * 60;
    const lag = localMinutes - start;
    if (lag >= 0 && lag <= CATCH_UP_MINUTES) return hour;
  }
  return null;
}

/** Metas diárias ainda em 0 hoje (água/sono/hábitos daily). */
export function areDailyGoalsStillZero(payload: GoalsPayload, dateKey: string): boolean {
  const dailyGoals = (payload.goals || []).filter((goal) => {
    const id = String(goal?.id || "");
    if (!id || id === "food" || id === "exercise") return false;
    const frequency = String(goal?.frequency || "daily");
    return frequency === "daily";
  });

  // Sem sync de metas ainda: lembrar mesmo assim (estado "zerado").
  if (!dailyGoals.length) return true;

  return dailyGoals.every((goal) => {
    const key = `${goal.id}:${dateKey}`;
    const value = payload.progress[key];
    const numeric = typeof value === "number" ? value : Number(value);
    return !Number.isFinite(numeric) || numeric <= 0;
  });
}

export function weightReminderSourceKey(year: number, month: number, userId: string) {
  const mm = String(month).padStart(2, "0");
  return `weight-reminder:${year}-${mm}:${userId}`;
}

export function goalsReminderSourceKey(dateKey: string, hour: number, userId: string) {
  return `goals-reminder:${dateKey}:${hour}:${userId}`;
}

/**
 * Lembretes da Evolução:
 * - peso: 1× por mês (dia 1, ~10h no fuso da paciente)
 * - metas: meio-dia e 20h se ainda zeradas no dia
 */
export class EvolutionReminderDispatchService {
  async dispatchDueReminders(now = new Date()): Promise<{ weight: number; goals: number }> {
    if (!isVapidConfigured()) return { weight: 0, goals: 0 };

    const rows = await prisma.user.findMany({
      where: {
        role: Role.PACIENTE,
        status: UserStatus.ATIVO,
        pushSubscriptions: { some: {} },
      },
      select: {
        id: true,
        accessExpiresAt: true,
        patientProfileData: true,
        patientGoalsData: true,
      },
    });

    let weight = 0;
    let goals = 0;

    for (const row of rows) {
      if (isPatientAccessExpired(row.accessExpiresAt)) continue;
      const profile = asProfile(row.patientProfileData);
      // Reaproveita o toggle de "lembretes de refeição" como opt-in geral de hábitos,
      // até existir preferência específica de Evolução.
      if (!isMealRemindersEnabled(profile)) continue;

      const timeZone = resolvePatientTimezone(profile);
      const dateKey = getDateKeyInTimeZone(timeZone, now);
      const localMinutes = getLocalMinutesInTimeZone(timeZone, now);
      const [year, month, day] = dateKey.split("-").map(Number);

      // Peso: dia 1 do mês, 10:00–10:02
      if (day === 1) {
        const lag = localMinutes - 10 * 60;
        if (lag >= 0 && lag <= CATCH_UP_MINUTES) {
          await notificationRepository.upsertBySourceKey({
            userId: row.id,
            type: "evolution",
            title: "Registrar peso",
            body: "Começou o mês — atualize seu peso na Evolução para acompanhar o progresso.",
            actionPath: "/evolucao",
            sourceKey: weightReminderSourceKey(year, month, row.id),
          });
          weight += 1;
        }
      }

      const reminderHour = isGoalReminderHour(localMinutes);
      if (reminderHour != null) {
        const goalsPayload = asGoalsPayload(row.patientGoalsData);
        if (areDailyGoalsStillZero(goalsPayload, dateKey)) {
          const isNoon = reminderHour === 12;
          await notificationRepository.upsertBySourceKey({
            userId: row.id,
            type: "evolution",
            title: "Metas do dia",
            body: isNoon
              ? "Suas metas ainda estão zeradas. Que tal registrar água, sono ou exercício?"
              : "Ainda dá tempo: suas metas do dia continuam zeradas. Abra a Evolução e atualize.",
            actionPath: "/evolucao?tab=metas",
            sourceKey: goalsReminderSourceKey(dateKey, reminderHour, row.id),
          });
          goals += 1;
        }
      }
    }

    if (weight > 0 || goals > 0) {
      console.log(`[EvolutionReminder] peso=${weight} metas=${goals}`);
    }

    return { weight, goals };
  }
}
