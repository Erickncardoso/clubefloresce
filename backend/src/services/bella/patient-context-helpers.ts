import { CheckInRepository } from "../../repositories/checkin.repository";
import { getWeekStart } from "../../utils/week-start";

const checkInRepository = new CheckInRepository();

export function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "Paciente";
}

export async function buildCheckInSummary(userId: string): Promise<string> {
  const weekStart = getWeekStart();
  const current = await checkInRepository.findByUserAndWeek(userId, weekStart);
  const history = await checkInRepository.findHistoryByUser(userId, 4);

  if (!current && !history.length) {
    return "Ainda não há check-ins registrados.";
  }

  const parts: string[] = [];

  if (current) {
    parts.push(
      `Semana atual: humor ${current.mood}/5, energia ${current.energy}/5` +
        (current.adherence != null ? `, aderência ${current.adherence}/5` : "") +
        (current.weightKg != null ? `, peso ${current.weightKg} kg` : ""),
    );
  } else {
    parts.push("Sem check-in registrado nesta semana.");
  }

  const past = history.filter((h) => h.weekStart.getTime() !== weekStart.getTime()).slice(0, 3);
  if (past.length) {
    const lines = past.map(
      (h) =>
        `${formatDate(h.weekStart)}: humor ${h.mood}/5, energia ${h.energy}/5` +
        (h.adherence != null ? `, aderência ${h.adherence}/5` : ""),
    );
    parts.push(`Semanas anteriores: ${lines.join("; ")}`);
  }

  return parts.join(" | ");
}
