import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { PatientProfileData } from "../types/patient-profile.types";
import { DEFAULT_PATIENT_TIMEZONE, isValidTimeZone } from "../utils/patient-timezone";

function asProfile(value: unknown): PatientProfileData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as PatientProfileData;
}

function toProfileJson(profile: PatientProfileData): Prisma.InputJsonValue {
  return profile as unknown as Prisma.InputJsonValue;
}

export function resolvePatientTimezone(profile: PatientProfileData): string {
  const tz = profile.timezone?.trim();
  if (tz && isValidTimeZone(tz)) return tz;
  return DEFAULT_PATIENT_TIMEZONE;
}

export function isMealRemindersEnabled(profile: PatientProfileData): boolean {
  return profile.mealRemindersEnabled !== false;
}

export function isDiarySocialPushEnabled(profile: PatientProfileData): boolean {
  return profile.diarySocialPushEnabled !== false;
}

const CATEGORY_ALIASES: Record<string, string> = {
  meal: "meals",
};

export function isPushCategoryEnabled(profile: PatientProfileData, type?: string | null): boolean {
  const key = CATEGORY_ALIASES[String(type || "").trim()] || String(type || "").trim();
  if (!key || key === "video_call") return true;
  if (key === "meals") return isMealRemindersEnabled(profile);
  if (key === "community") return isDiarySocialPushEnabled(profile);
  const categories = profile.pushCategories;
  if (categories && typeof categories === "object" && key in categories) {
    return categories[key] !== false;
  }
  return true;
}

export class PatientPreferencesService {
  async syncTimezone(userId: string, timeZone?: string | null): Promise<void> {
    const zone = timeZone?.trim();
    if (!zone || !isValidTimeZone(zone)) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { patientProfileData: true },
    });
    if (!user) return;

    const profile = asProfile(user.patientProfileData);
    if (profile.timezone === zone) return;

    await prisma.user.update({
      where: { id: userId },
      data: {
        patientProfileData: toProfileJson({ ...profile, timezone: zone }),
      },
    });
  }

  async setMealRemindersEnabled(userId: string, enabled: boolean): Promise<PatientProfileData> {
    return this.patchProfile(userId, { mealRemindersEnabled: enabled });
  }

  async setDiarySocialPushEnabled(userId: string, enabled: boolean): Promise<PatientProfileData> {
    return this.patchProfile(userId, { diarySocialPushEnabled: enabled });
  }

  async setPushCategories(
    userId: string,
    categories: Record<string, boolean>,
  ): Promise<PatientProfileData> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { patientProfileData: true },
    });
    if (!user) throw new Error("Usuário não encontrado.");

    const profile = asProfile(user.patientProfileData);
    const nextCategories = { ...(profile.pushCategories || {}), ...categories };
    const patch: Partial<PatientProfileData> = { pushCategories: nextCategories };
    if (typeof categories.meals === "boolean") patch.mealRemindersEnabled = categories.meals;
    if (typeof categories.community === "boolean") {
      patch.diarySocialPushEnabled = categories.community;
    }
    return this.patchProfile(userId, patch);
  }

  private async patchProfile(
    userId: string,
    patch: Partial<PatientProfileData>,
  ): Promise<PatientProfileData> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { patientProfileData: true },
    });
    if (!user) throw new Error("Usuário não encontrado.");

    const profile = asProfile(user.patientProfileData);
    const next = { ...profile, ...patch };

    await prisma.user.update({
      where: { id: userId },
      data: { patientProfileData: toProfileJson(next) },
    });

    return next;
  }

  async getPreferences(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { patientProfileData: true },
    });
    if (!user) throw new Error("Usuário não encontrado.");

    const profile = asProfile(user.patientProfileData);
    return {
      timezone: resolvePatientTimezone(profile),
      mealRemindersEnabled: isMealRemindersEnabled(profile),
      diarySocialPushEnabled: isDiarySocialPushEnabled(profile),
      pushCategories: profile.pushCategories || {},
    };
  }
}
