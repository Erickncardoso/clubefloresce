import { CheckInRepository } from "../repositories/checkin.repository";
import { assertPatientUser, resolveWeekStart } from "../utils/patient-access";
import { resolvePatientWeekStart, type PatientWeekHeaders } from "../utils/week-start";

const checkInRepository = new CheckInRepository();

export type CheckInPayload = {
  mood: number;
  energy: number;
  adherence?: number | null;
  weightKg?: number | string | null;
  notes?: string;
  weekStart?: string | null;
};

function clampScore(value: unknown, min = 1, max = 5): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error("Valor inválido.");
  return Math.min(max, Math.max(min, Math.round(n)));
}

export class CheckInService {
  async getMyCheckIns(userId: string, patientHeaders?: PatientWeekHeaders) {
    const weekStart = resolvePatientWeekStart(patientHeaders);
    const current = await checkInRepository.findByUserAndWeek(userId, weekStart);
    const history = await checkInRepository.findHistoryByUser(userId, 12);
    return { weekStart, current, history };
  }

  private normalizePayload(data: CheckInPayload, weekStart: Date) {
    const mood = clampScore(data.mood);
    const energy = clampScore(data.energy);
    const adherence =
      data.adherence === undefined || data.adherence === null
        ? null
        : clampScore(data.adherence);

    let weightKg: number | null = null;
    const rawWeight = data.weightKg;
    if (rawWeight !== undefined && rawWeight !== null && String(rawWeight).trim() !== "") {
      const w = Number(rawWeight);
      if (!Number.isFinite(w) || w <= 0 || w > 500) {
        throw new Error("Peso inválido.");
      }
      weightKg = Math.round(w * 10) / 10;
    }

    const notes = data.notes?.trim() || null;
    if (notes && notes.length > 2000) {
      throw new Error("Observações muito longas (máx. 2000 caracteres).");
    }

    return { weekStart, mood, energy, adherence, weightKg, notes };
  }

  async submitCheckIn(userId: string, data: CheckInPayload, patientHeaders?: PatientWeekHeaders) {
    const weekStart = resolvePatientWeekStart(patientHeaders);
    const payload = this.normalizePayload(data, weekStart);
    return checkInRepository.upsert({ userId, ...payload });
  }

  async getPatientCheckIns(userId: string) {
    await assertPatientUser(userId);
    const weekStart = resolvePatientWeekStart();
    const current = await checkInRepository.findByUserAndWeek(userId, weekStart);
    const history = await checkInRepository.findHistoryByUser(userId, 52);
    return { weekStart, current, history };
  }

  async upsertForPatient(userId: string, data: CheckInPayload) {
    await assertPatientUser(userId);
    const weekStart = resolveWeekStart(data.weekStart);
    const payload = this.normalizePayload(data, weekStart);
    return checkInRepository.upsert({ userId, ...payload });
  }

  async listForNutricionista() {
    return checkInRepository.findRecentForNutri(80);
  }
}
