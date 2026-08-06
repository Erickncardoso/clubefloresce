import bcrypt from "bcrypt";
import { Role, UserPlan, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { isValidWhatsappPhone } from "../utils/phone";

const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(email: unknown): string {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

export async function lookupGuestCheckoutEmail(emailInput?: string | null) {
  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) {
    return { email: "", valid: false, exists: false, needsPassword: false };
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, status: true, name: true },
  });

  if (!existing) {
    return {
      email,
      valid: true,
      exists: false,
      needsPassword: true,
      suggestedName: email.split("@")[0] || "",
    };
  }

  if (existing.role === Role.NUTRICIONISTA || existing.role !== Role.PACIENTE) {
    return {
      email,
      valid: false,
      exists: true,
      needsPassword: false,
      blocked: true,
      message: "Este e-mail não pode ser usado para assinatura de paciente.",
    };
  }

  if (existing.status === UserStatus.INATIVO) {
    return {
      email,
      valid: false,
      exists: true,
      needsPassword: false,
      blocked: true,
      message: "Esta conta está desativada. Entre em contato com o suporte.",
    };
  }

  return {
    email,
    valid: true,
    exists: true,
    needsPassword: false,
    suggestedName: existing.name || "",
  };
}

/**
 * Garante um paciente para checkout guest (e-mail no pagamento, sem login).
 * Conta existente: reutiliza.
 * Conta nova: exige senha escolhida pela paciente.
 */
export async function ensurePatientForGuestCheckout(input: {
  email?: string | null;
  name?: string | null;
  password?: string | null;
  phone?: string | null;
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
    return { ...existing, created: false as const };
  }

  const password = String(input.password || "");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Crie uma senha com pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  const phoneRaw = String(input.phone || "").trim();
  if (!phoneRaw) {
    throw new Error("Informe seu WhatsApp.");
  }
  if (!isValidWhatsappPhone(phoneRaw)) {
    throw new Error("Informe um WhatsApp válido com DDD.");
  }

  const displayName = String(input.name || "").trim() || email.split("@")[0] || "Paciente";
  const passwordHash = await bcrypt.hash(password, 10);

  const created = await prisma.user.create({
    data: {
      email,
      name: displayName,
      phone: phoneRaw,
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

  return { ...created, created: true as const };
}
