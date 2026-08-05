import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { Role, UserPlan, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

function normalizeEmail(email: unknown): string {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

/**
 * Garante um paciente para checkout guest (e-mail no pagamento, sem login).
 * Conta existente de paciente: reutiliza. Nutri: rejeita.
 * Conta nova: cria FREE ativa com senha aleatória (pode redefinir depois).
 */
export async function ensurePatientForGuestCheckout(input: {
  email?: string | null;
  name?: string | null;
}) {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    throw new Error("Informe um e-mail válido para o pagamento.");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      plan: true,
    },
  });

  if (existing?.role === Role.NUTRICIONISTA) {
    throw new Error("Este e-mail não pode ser usado para assinatura de paciente.");
  }

  if (existing) {
    if (existing.status === UserStatus.INATIVO) {
      throw new Error("Esta conta está desativada. Entre em contato com o suporte.");
    }
    if (existing.role !== Role.PACIENTE) {
      throw new Error("Este e-mail não pode ser usado para assinatura de paciente.");
    }
    return existing;
  }

  const displayName = String(input.name || "").trim() || email.split("@")[0] || "Paciente";
  const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);

  return prisma.user.create({
    data: {
      email,
      name: displayName,
      password: passwordHash,
      role: Role.PACIENTE,
      status: UserStatus.ATIVO,
      plan: UserPlan.FREE,
      accessExpiresAt: null,
      approvalEmailSentAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      plan: true,
    },
  });
}
