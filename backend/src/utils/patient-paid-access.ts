import { UserPlan } from "@prisma/client";
import { isPatientAccessExpired } from "./access-expires";

/** Paciente com plano pago e acesso ainda válido. */
export function isPatientPaidAccessActive(
  plan?: UserPlan | string | null,
  accessExpiresAt?: Date | string | null,
): boolean {
  const normalizedPlan = String(plan || UserPlan.FREE).toUpperCase();
  if (normalizedPlan === UserPlan.FREE) return false;
  return !isPatientAccessExpired(accessExpiresAt);
}

/** Bloqueia o app até concluir ou renovar o pagamento. */
export function isPatientAppAccessBlocked(
  plan?: UserPlan | string | null,
  accessExpiresAt?: Date | string | null,
): boolean {
  return !isPatientPaidAccessActive(plan, accessExpiresAt);
}

export const PATIENT_PAYMENT_REQUIRED_MESSAGE =
  "Finalize sua assinatura para acessar o Clube Florescer.";

export const PATIENT_ACCESS_EXPIRED_RENEW_MESSAGE =
  "Sua assinatura expirou. Renove para continuar usando o app.";
