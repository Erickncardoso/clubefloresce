import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

/** CPF de teste do Mercado Pago — não grava na ficha do paciente. */
const MERCADOPAGO_TEST_CPF = "12345678909";

export function cpfDigits(value: unknown): string {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  return digits.length === 11 ? digits : "";
}

export function cpfFromPatientProfileData(data: unknown): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "";
  return cpfDigits((data as { cpf?: unknown }).cpf);
}

export function checkoutCpfToPersist(identification?: { number?: string } | null): string {
  const number = cpfDigits(identification?.number);
  if (!number || number === MERCADOPAGO_TEST_CPF) return "";
  return number;
}

/** Preenche o CPF da ficha só se ainda estiver vazio. */
export async function persistCheckoutCpfIfMissing(
  userId: string,
  identification?: { number?: string } | null,
): Promise<void> {
  const number = checkoutCpfToPersist(identification);
  if (!userId || !number) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { patientProfileData: true },
  });
  if (!user || cpfFromPatientProfileData(user.patientProfileData)) return;

  const current = user.patientProfileData && typeof user.patientProfileData === "object" && !Array.isArray(user.patientProfileData)
    ? { ...(user.patientProfileData as Record<string, unknown>) }
    : {};

  await prisma.user.update({
    where: { id: userId },
    data: {
      patientProfileData: { ...current, cpf: number } as Prisma.InputJsonValue,
    },
  });
}

export async function isPixBillingPayer(
  userId: string,
  storedMethod?: string | null,
): Promise<boolean> {
  const stored = String(storedMethod || "").trim().toLowerCase();
  if (stored === "pix") return true;
  if (stored === "card") return false;

  const lastPaid = await prisma.transaction.findFirst({
    where: { userId, status: "PAID" },
    orderBy: { createdAt: "desc" },
    select: { paymentMethod: true },
  });
  return String(lastPaid?.paymentMethod || "").toLowerCase() === "pix";
}
