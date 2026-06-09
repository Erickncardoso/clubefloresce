import { PrismaClient, Role } from "@prisma/client";
import { getWeekStart } from "./week-start";

const prisma = new PrismaClient();

export async function assertPatientUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      plan: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error("Paciente não encontrado.");
  }

  if (user.role !== Role.PACIENTE) {
    throw new Error("Este usuário não é paciente.");
  }

  return user;
}

export function resolveWeekStart(raw?: string | null): Date {
  if (raw && String(raw).trim()) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return getWeekStart(parsed);
    }
  }
  return getWeekStart();
}
