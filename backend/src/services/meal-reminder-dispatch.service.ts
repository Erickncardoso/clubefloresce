import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { FoodDiaryRepository } from "../repositories/food-diary.repository";
import { NotificationRepository } from "../repositories/notification.repository";
import type { ParsedMealPlan } from "../types/meal-plan.types";
import type { PatientProfileData } from "../types/patient-profile.types";
import { getMealsForReminder, parseTimeToMinutes } from "../utils/meal-time";
import { getLocalMinutesInTimeZone } from "../utils/patient-local-clock";
import {
  entryDateFromKey,
  getDateKeyInTimeZone,
} from "../utils/patient-timezone";
import { isPatientAccessExpired } from "../utils/access-expires";
import {
  isMealRemindersEnabled,
  resolvePatientTimezone,
} from "./patient-preferences.service";
import { isVapidConfigured } from "../utils/vapid-config";

const notificationRepository = new NotificationRepository();
const foodDiaryRepository = new FoodDiaryRepository();

export function mealReminderSourceKey(dateKey: string, mealId: string, userId: string) {
  return `meal-reminder:${dateKey}:${mealId}:${userId}`;
}

function asProfile(value: unknown): PatientProfileData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as PatientProfileData;
}

function asMealPlan(value: unknown): ParsedMealPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const plan = value as ParsedMealPlan;
  if (!Array.isArray(plan.meals)) return null;
  return plan;
}

type EligiblePatient = {
  id: string;
  profile: PatientProfileData;
  plan: ParsedMealPlan | null;
};

export class MealReminderDispatchService {
  private async listEligiblePatients(): Promise<EligiblePatient[]> {
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
        patientMealPlan: { select: { plan: true } },
      },
    });

    return rows
      .filter((row) => !isPatientAccessExpired(row.accessExpiresAt))
      .map((row) => {
        const profile = asProfile(row.patientProfileData);
        if (!isMealRemindersEnabled(profile)) return null;
        return {
          id: row.id,
          profile,
          plan: asMealPlan(row.patientMealPlan?.plan),
        };
      })
      .filter(Boolean) as EligiblePatient[];
  }

  async dispatchDueReminders(now = new Date()): Promise<{ sent: number; skipped: number }> {
    if (!isVapidConfigured()) return { sent: 0, skipped: 0 };

    const patients = await this.listEligiblePatients();
    let sent = 0;
    let skipped = 0;

    for (const patient of patients) {
      const result = await this.dispatchForPatient(patient, now);
      sent += result.sent;
      skipped += result.skipped;
    }

    if (sent > 0) {
      console.log(`[MealReminder] ${sent} lembrete(s) enviado(s).`);
    }

    return { sent, skipped };
  }

  private async dispatchForPatient(
    patient: EligiblePatient,
    now: Date,
  ): Promise<{ sent: number; skipped: number }> {
    const timeZone = resolvePatientTimezone(patient.profile);
    const dateKey = getDateKeyInTimeZone(timeZone, now);
    const localMinutes = getLocalMinutesInTimeZone(timeZone, now);
    const meals = getMealsForReminder(patient.plan?.meals ?? []);
    const dueMeals = meals.filter((meal) => parseTimeToMinutes(meal.time) === localMinutes);

    if (!dueMeals.length) return { sent: 0, skipped: 0 };

    const entryDate = entryDateFromKey(dateKey);
    const entries = await foodDiaryRepository.findEntriesByDate(patient.id, entryDate);
    const loggedMealTypes = new Set(entries.map((entry) => entry.mealType));

    let sent = 0;
    let skipped = 0;

    for (const meal of dueMeals) {
      if (loggedMealTypes.has(meal.id)) {
        skipped += 1;
        continue;
      }

      const sourceKey = mealReminderSourceKey(dateKey, meal.id, patient.id);
      const title = `Hora do ${meal.label}!`;
      const body = "Registre sua refeição no diário alimentar.";

      await notificationRepository.upsertBySourceKey({
        userId: patient.id,
        type: "meal",
        title,
        body,
        actionPath: `/dieta?meal=${encodeURIComponent(meal.id)}`,
        sourceKey,
      });

      sent += 1;
    }

    return { sent, skipped };
  }
}
