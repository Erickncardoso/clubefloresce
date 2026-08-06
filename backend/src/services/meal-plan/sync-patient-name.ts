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

/**
 * Nome da conta NÃO é sobrescrito pelo plano alimentar.
 * O patientName do PDF fica só no registro do plano; o paciente edita o nome em Configurações.
 */
export async function syncUserNameFromMealPlan(
  userId: string,
  _patientName?: string | null,
): Promise<Omit<User, "password"> | null> {
  const user = await userRepository.findById(userId);
  if (!user) return null;
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
