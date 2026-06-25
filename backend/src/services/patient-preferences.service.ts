import { prisma } from "../lib/prisma";
import type { PatientProfileData } from "../types/patient-profile.types";
import { DEFAULT_PATIENT_TIMEZONE, isValidTimeZone } from "../utils/patient-timezone";

function asProfile(value: unknown): PatientProfileData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as PatientProfileData;
}

export function resolvePatientTimezone(profile: PatientProfileData): string {
  const tz = profile.timezone?.trim();
  if (tz && isValidTimeZone(tz)) return tz;
  return DEFAULT_PATIENT_TIMEZONE;
}

export function isMealRemindersEnabled(profile: PatientProfileData): boolean {
  return profile.mealRemindersEnabled !== false;
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
        patientProfileData: { ...profile, timezone: zone },
      },
    });
  }

  async setMealRemindersEnabled(userId: string, enabled: boolean): Promise<PatientProfileData> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { patientProfileData: true },
    });
    if (!user) throw new Error("Usuário não encontrado.");

    const profile = asProfile(user.patientProfileData);
    const next = { ...profile, mealRemindersEnabled: enabled };

    await prisma.user.update({
      where: { id: userId },
      data: { patientProfileData: next },
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
    };
  }
}
