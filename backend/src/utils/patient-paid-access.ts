import { UserPlan } from "@prisma/client";
import { isPatientAccessExpired } from "./access-expires";

export type PatientAccessFields = {
  plan?: UserPlan | string | null;
  accessExpiresAt?: Date | string | null;
  approvalEmailSentAt?: Date | string | null;
};

/** Acesso liberado manualmente pela nutricionista — exige aprovação registrada no backend. */
export function isPatientManuallyGrantedAccess(fields: PatientAccessFields): boolean {
  if (!fields.approvalEmailSentAt) return false;
  if (!fields.accessExpiresAt) return true;
  return !isPatientAccessExpired(fields.accessExpiresAt);
}

/** Paciente com plano pago ou liberação manual ainda válida. */
export function isPatientPaidAccessActive(
  plan?: UserPlan | string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  if (isPatientManuallyGrantedAccess({ plan, accessExpiresAt, approvalEmailSentAt })) {
    return true;
  }
  const normalizedPlan = String(plan || UserPlan.FREE).toUpperCase();
  if (normalizedPlan === UserPlan.FREE) return false;
  return !isPatientAccessExpired(accessExpiresAt);
}

/** Bloqueia o app até concluir ou renovar o pagamento (só cadastros novos sem liberação manual). */
export function isPatientAppAccessBlocked(
  plan?: UserPlan | string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  return !isPatientPaidAccessActive(plan, accessExpiresAt, approvalEmailSentAt);
}

export function patientHadGrantedAccess(fields: PatientAccessFields): boolean {
  const normalizedPlan = String(fields.plan || UserPlan.FREE).toUpperCase();
  if (normalizedPlan !== UserPlan.FREE) return true;
  if (fields.approvalEmailSentAt) return true;
  if (fields.accessExpiresAt) return true;
  return false;
}

export const PATIENT_PAYMENT_REQUIRED_MESSAGE =
  "Finalize sua assinatura para acessar o Clube Florescer.";

export const PATIENT_ACCESS_EXPIRED_RENEW_MESSAGE =
  "Sua assinatura expirou. Renove para continuar usando o app.";
