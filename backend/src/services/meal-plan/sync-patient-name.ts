import { User } from "@prisma/client";
import { UserRepository } from "../../repositories/user.repository";

const userRepository = new UserRepository();

export function normalizePersonName(value: string | null | undefined): string | null {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[.|,;:]+$/g, "")
    .trim();

  if (!normalized || /^paciente$/i.test(normalized)) {
    return null;
  }

  return normalized;
}

export async function syncUserNameFromMealPlan(
  userId: string,
  patientName: string | null | undefined,
): Promise<Omit<User, "password"> | null> {
  const nameFromPlan = normalizePersonName(patientName);
  if (!nameFromPlan) return null;

  const user = await userRepository.findById(userId);
  if (!user) return null;

  if (user.name.trim() === nameFromPlan) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  const updated = await userRepository.update(userId, { name: nameFromPlan });
  const { password, ...userWithoutPassword } = updated;
  return userWithoutPassword;
}
