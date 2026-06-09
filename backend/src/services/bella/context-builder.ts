import { CheckInRepository } from "../../repositories/checkin.repository";
import { CourseRepository } from "../../repositories/course.repository";
import { UserRepository } from "../../repositories/user.repository";
import { getWeekStart } from "../../utils/week-start";
import type { UserContextSnapshot } from "./types";
import { buildPatientVerifiedMemory } from "./patient-memory";

const checkInRepository = new CheckInRepository();
const courseRepository = new CourseRepository();
const userRepository = new UserRepository();

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "Paciente";
}

async function buildCheckInSummary(userId: string): Promise<string> {
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

async function buildCoursesSummary(): Promise<string> {
  const courses = await courseRepository.findAll();
  if (!courses.length) return "Nenhum curso cadastrado no momento.";

  const top = courses.slice(0, 5);
  return top
    .map((c) => {
      const modules = (c as { modules?: unknown[] }).modules?.length ?? 0;
      return `"${c.title}" (${modules} módulos)`;
    })
    .join(", ");
}

export async function buildUserContext(
  userId: string,
  patientDateKey?: string,
): Promise<UserContextSnapshot> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const [checkInSummary, availableCourses, verifiedMemory] = await Promise.all([
    buildCheckInSummary(userId),
    buildCoursesSummary(),
    buildPatientVerifiedMemory(userId, patientDateKey),
  ]);

  return {
    userId,
    name: user.name,
    firstName: firstName(user.name),
    plan: user.plan,
    memberSince: formatDate(user.createdAt),
    checkInSummary,
    availableCourses,
    verifiedMemory: verifiedMemory.promptBlock,
    currentMealSlot: verifiedMemory.currentMealSlot,
    hasMealPlan: verifiedMemory.hasMealPlan,
  };
}

export { buildCheckInSummary, buildCoursesSummary, firstName, formatDate };
