import { CheckInRepository } from "../repositories/checkin.repository";
import { getWeekStart } from "../utils/week-start";

const checkInRepository = new CheckInRepository();

function clampScore(value: unknown, min = 1, max = 5): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error("Valor inválido.");
  return Math.min(max, Math.max(min, Math.round(n)));
}

export class CheckInService {
  async getMyCheckIns(userId: string) {
    const weekStart = getWeekStart();
    const current = await checkInRepository.findByUserAndWeek(userId, weekStart);
    const history = await checkInRepository.findHistoryByUser(userId, 12);
    return { weekStart, current, history };
  }

  async submitCheckIn(
    userId: string,
    data: { mood: number; energy: number; adherence?: number; weightKg?: number | string | null; notes?: string }
  ) {
    const weekStart = getWeekStart();
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

    return checkInRepository.upsert({
      userId,
      weekStart,
      mood,
      energy,
      adherence,
      weightKg,
      notes,
    });
  }

  async listForNutricionista() {
    return checkInRepository.findRecentForNutri(80);
  }
}
