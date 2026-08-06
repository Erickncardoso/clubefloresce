import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { FoodDiaryRepository } from "../repositories/food-diary.repository";
import { NotificationRepository } from "../repositories/notification.repository";
import type { ParsedMeal, ParsedMealPlan } from "../types/meal-plan.types";
import type { PatientProfileData } from "../types/patient-profile.types";
import { getMealsForReminder, parseTimeToMinutes } from "../utils/meal-time";
import {
  buildMealReminderBody,
  buildMealReminderTitle,
} from "../utils/meal-reminder-copy";
import {
  activeMeals,
  groupMealOptions,
  mealSlotDisplayLabel,
  normalizeMealSlotKey,
} from "../utils/meal-plan-options";
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

/** Janela de atraso (minutos) para não perder lembrete se o job atrasar. */
const CATCH_UP_MINUTES = 2;

/**
 * Chave estável por dia + slot (não por mealId da opção).
 * Assim trocar a opção do lanche não gera 2º push no mesmo dia.
 */
export function mealReminderSourceKey(dateKey: string, slotKey: string, userId: string) {
  return `meal-reminder:${dateKey}:${slotKey}:${userId}`;
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

function siblingMealIds(planMeals: ParsedMeal[], mealId: string): string[] {
  const groups = groupMealOptions(planMeals);
  const group = groups.find((item) => item.options.some((meal) => meal.id === mealId));
  if (group) return group.options.map((meal) => meal.id);
  return [mealId];
}

function isMealDue(mealTime: string, localMinutes: number): boolean {
  const mealMinutes = parseTimeToMinutes(mealTime);
  const lag = localMinutes - mealMinutes;
  return lag >= 0 && lag <= CATCH_UP_MINUTES;
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
    const rawMeals = patient.plan?.meals ?? [];

    // Só a opção ativa de cada slot (ex.: 1 Lanche da tarde, não as 3)
    const activePlanMeals = activeMeals(rawMeals, patient.plan?.selectedMealBySlot);
    const mealsById = new Map(activePlanMeals.map((meal) => [meal.id, meal]));

    const meals = getMealsForReminder(activePlanMeals)
      .map((meal) => ({
        ...meal,
        label: mealSlotDisplayLabel(meal.label),
        slotKey: normalizeMealSlotKey(meal.label),
      }))
      .filter((meal) => isMealDue(meal.time, localMinutes));

    // Um lembrete por slot mesmo se horários coincidirem
    const dueBySlot = new Map<string, (typeof meals)[number]>();
    for (const meal of meals) {
      if (!dueBySlot.has(meal.slotKey)) dueBySlot.set(meal.slotKey, meal);
    }
    const dueMeals = [...dueBySlot.values()];

    if (!dueMeals.length) return { sent: 0, skipped: 0 };

    const entryDate = entryDateFromKey(dateKey);
    const entries = await foodDiaryRepository.findEntriesByDate(patient.id, entryDate);
    const loggedMealTypes = new Set(entries.map((entry) => entry.mealType));

    let sent = 0;
    let skipped = 0;

    for (const meal of dueMeals) {
      const relatedIds = siblingMealIds(rawMeals, meal.id);
      if (relatedIds.some((id) => loggedMealTypes.has(id))) {
        skipped += 1;
        continue;
      }

      const fullMeal = mealsById.get(meal.id) || null;
      const sourceKey = mealReminderSourceKey(dateKey, meal.slotKey, patient.id);
      const title = buildMealReminderTitle({ label: meal.label });
      const body = buildMealReminderBody({ items: fullMeal?.items || [] });

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
