import { CourseRepository } from "../../repositories/course.repository";
import { UserRepository } from "../../repositories/user.repository";
import type { UserContextSnapshot } from "./types";
import { buildPatientVerifiedMemory } from "./patient-memory";
import {
  buildCheckInSummary,
  firstName,
  formatDate,
} from "./patient-context-helpers";

const courseRepository = new CourseRepository();
const userRepository = new UserRepository();

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
