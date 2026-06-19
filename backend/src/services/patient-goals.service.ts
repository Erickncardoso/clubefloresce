import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { assertPatientUser } from "../utils/patient-access";

export interface PatientGoalsPayload {
  goals: unknown[];
  progress: Record<string, number>;
}

function normalizePayload(raw: unknown): PatientGoalsPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const goals = Array.isArray(data.goals) ? data.goals : [];
  const progress =
    data.progress && typeof data.progress === "object"
      ? (data.progress as Record<string, number>)
      : {};
  return { goals, progress };
}

export class PatientGoalsService {
  async getForUser(userId: string): Promise<PatientGoalsPayload | null> {
    await assertPatientUser(userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { patientGoalsData: true },
    });
    if (!user) throw new Error("Paciente não encontrado.");
    return normalizePayload(user.patientGoalsData);
  }

  async saveForUser(userId: string, payload: PatientGoalsPayload): Promise<PatientGoalsPayload> {
    await assertPatientUser(userId);
    const goals = Array.isArray(payload.goals) ? payload.goals : [];
    const progress =
      payload.progress && typeof payload.progress === "object" ? payload.progress : {};

    await prisma.user.update({
      where: { id: userId },
      data: {
        patientGoalsData: { goals, progress } as unknown as Prisma.InputJsonValue,
      },
    });

    return { goals, progress };
  }
}
