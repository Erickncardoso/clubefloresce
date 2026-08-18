import { UserRepository } from "../repositories/user.repository";
import { scheduleRagReindex } from "./rag/rag-hooks";
import type {
  PatientGender,
  PatientMaritalStatus,
  PatientPrimaryGoal,
  PatientProfileData,
  PatientProfileResponse,
  PatientWorkoutsPerWeek,
} from "../types/patient-profile.types";

const GENDERS = new Set<PatientGender>(["female", "male", "other", "prefer_not_say"]);
const MARITAL = new Set<PatientMaritalStatus>([
  "single",
  "married",
  "divorced",
  "widowed",
  "stable_union",
  "other",
]);
const GOALS = new Set<PatientPrimaryGoal>([
  "lose_weight",
  "maintain",
  "gain_weight",
  "muscle",
  "health",
]);
const WORKOUTS = new Set<PatientWorkoutsPerWeek>(["0-2", "3-5", "6+"]);

const BASE_REQUIRED: (keyof PatientProfileData)[] = [
  "gender",
  "birthDate",
  "heightCm",
  "weightKg",
  "primaryGoal",
  "workoutsPerWeek",
];

function asObject(value: unknown): PatientProfileData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as PatientProfileData;
}

function onlyDigits(value: unknown, max = 32): string {
  return String(value || "").replace(/\D/g, "").slice(0, max);
}

function parseCpf(value: unknown): string | null {
  const digits = onlyDigits(value, 11);
  if (!digits) return null;
  if (digits.length !== 11) throw new Error("CPF inválido.");
  return digits;
}

function parseOptionalString(value: unknown, max: number): string | null {
  if (value == null || value === "") return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (trimmed.length > max) {
    throw new Error(`Texto muito longo (máximo ${max} caracteres).`);
  }
  return trimmed;
}

function parseBirthDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  if (date > now) return null;
  const ageMs = now.getTime() - date.getTime();
  const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
  if (ageYears < 10 || ageYears > 120) return null;
  return value;
}

function parseHeightCm(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 100 || rounded > 250) return null;
  return rounded;
}

function parseWeightKg(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n * 10) / 10;
  if (rounded < 30 || rounded > 300) return null;
  return rounded;
}

function missingFields(profile: PatientProfileData): string[] {
  const missing: string[] = [];

  for (const key of BASE_REQUIRED) {
    const value = profile[key];
    if (value == null || value === "") missing.push(key);
  }

  const needsTarget =
    profile.primaryGoal === "lose_weight" || profile.primaryGoal === "gain_weight";
  if (needsTarget && profile.targetWeightKg == null) {
    missing.push("targetWeightKg");
  }

  return missing;
}

function buildResponse(
  profile: PatientProfileData,
  onboardingCompletedAt: Date | null,
): PatientProfileResponse {
  const missing = missingFields(profile);
  const isComplete = Boolean(onboardingCompletedAt);

  return {
    profile,
    onboardingCompletedAt: onboardingCompletedAt?.toISOString() ?? null,
    isComplete,
    missingFields: isComplete ? [] : missing,
  };
}

export class PatientProfileService {
  private users = new UserRepository();

  async getMine(userId: string): Promise<PatientProfileResponse> {
    const user = await this.users.findById(userId);
    if (!user) throw new Error("Usuário não encontrado.");

    return buildResponse(
      asObject(user.patientProfileData),
      user.onboardingCompletedAt ?? null,
    );
  }

  async saveMine(userId: string, payload: Record<string, unknown>, complete = false) {
    const user = await this.users.findById(userId);
    if (!user) throw new Error("Usuário não encontrado.");

    const current = asObject(user.patientProfileData);
    const next: PatientProfileData = { ...current };

    if ("gender" in payload) {
      const gender = payload.gender;
      if (gender == null || gender === "") {
        next.gender = null;
      } else if (GENDERS.has(gender as PatientGender)) {
        next.gender = gender as PatientGender;
      } else {
        throw new Error("Gênero inválido.");
      }
    }

    if ("birthDate" in payload) {
      if (payload.birthDate == null || payload.birthDate === "") {
        next.birthDate = null;
      } else {
        const parsed = parseBirthDate(payload.birthDate);
        if (!parsed) throw new Error("Data de nascimento inválida.");
        next.birthDate = parsed;
      }
    }

    if ("heightCm" in payload) {
      if (payload.heightCm == null || payload.heightCm === "") {
        next.heightCm = null;
      } else {
        const parsed = parseHeightCm(payload.heightCm);
        if (parsed == null) throw new Error("Altura inválida.");
        next.heightCm = parsed;
      }
    }

    if ("weightKg" in payload) {
      if (payload.weightKg == null || payload.weightKg === "") {
        next.weightKg = null;
      } else {
        const parsed = parseWeightKg(payload.weightKg);
        if (parsed == null) throw new Error("Peso inválido.");
        next.weightKg = parsed;
      }
    }

    if ("targetWeightKg" in payload) {
      if (payload.targetWeightKg == null || payload.targetWeightKg === "") {
        next.targetWeightKg = null;
      } else {
        const parsed = parseWeightKg(payload.targetWeightKg);
        if (parsed == null) throw new Error("Peso desejado inválido.");
        next.targetWeightKg = parsed;
      }
    }

    if ("primaryGoal" in payload) {
      const goal = payload.primaryGoal;
      if (goal == null || goal === "") {
        next.primaryGoal = null;
      } else if (GOALS.has(goal as PatientPrimaryGoal)) {
        next.primaryGoal = goal as PatientPrimaryGoal;
      } else {
        throw new Error("Objetivo inválido.");
      }
    }

    if ("workoutsPerWeek" in payload) {
      const workouts = payload.workoutsPerWeek;
      if (workouts == null || workouts === "") {
        next.workoutsPerWeek = null;
      } else if (WORKOUTS.has(workouts as PatientWorkoutsPerWeek)) {
        next.workoutsPerWeek = workouts as PatientWorkoutsPerWeek;
      } else {
        throw new Error("Frequência de treinos inválida.");
      }
    }

    if ("maritalStatus" in payload) {
      const maritalStatus = payload.maritalStatus;
      if (maritalStatus == null || maritalStatus === "") {
        next.maritalStatus = null;
      } else if (MARITAL.has(maritalStatus as PatientMaritalStatus)) {
        next.maritalStatus = maritalStatus as PatientMaritalStatus;
      } else {
        throw new Error("Estado civil inválido.");
      }
    }

    if ("cpf" in payload) {
      if (payload.cpf == null || payload.cpf === "") {
        next.cpf = null;
      } else {
        next.cpf = parseCpf(payload.cpf);
      }
    }

    if ("occupation" in payload) {
      next.occupation = parseOptionalString(payload.occupation, 80);
    }

    const missing = missingFields(next);
    if (complete && missing.length > 0) {
      throw new Error(`Preencha os campos obrigatórios: ${missing.join(", ")}`);
    }

    const shouldMarkComplete = Boolean(complete) || missing.length === 0;
    const onboardingCompletedAt = shouldMarkComplete
      ? user.onboardingCompletedAt ?? new Date()
      : user.onboardingCompletedAt ?? null;

    const updated = await this.users.update(userId, {
      patientProfileData: next,
      onboardingCompletedAt,
    });

    scheduleRagReindex({ type: "profile", userId });

    return buildResponse(asObject(updated.patientProfileData), updated.onboardingCompletedAt);
  }
}
