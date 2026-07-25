import { UserPlan } from "@prisma/client";
import { isPatientAccessExpired } from "./access-expires";

export type PatientAccessFields = {
  plan?: UserPlan | string | null;
  accessExpiresAt?: Date | string | null;
  approvalEmailSentAt?: Date | string | null;
};

function normalizedPlan(plan?: UserPlan | string | null): string {
  return String(plan || UserPlan.FREE).toUpperCase();
}

/** Acesso liberado manualmente pela nutricionista — exige aprovação registrada no backend. */
export function isPatientManuallyGrantedAccess(fields: PatientAccessFields): boolean {
  if (!fields.approvalEmailSentAt) return false;
  if (!fields.accessExpiresAt) return true;
  return !isPatientAccessExpired(fields.accessExpiresAt);
}

/**
 * Acesso completo (Essencial/Completo) ainda válido.
 * FREE nunca é full — mesmo com liberação manual.
 */
export function isPatientFullAccessActive(
  plan?: UserPlan | string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  if (normalizedPlan(plan) === UserPlan.FREE) return false;
  if (isPatientManuallyGrantedAccess({ plan, accessExpiresAt, approvalEmailSentAt })) {
    return true;
  }
  return !isPatientAccessExpired(accessExpiresAt);
}

/**
 * FREE liberado pela nutri: só dieta/metas (e rotas básicas).
 * Sem Bella, cursos, comunidade, etc.
 */
export function isPatientLimitedAccessActive(
  plan?: UserPlan | string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  if (normalizedPlan(plan) !== UserPlan.FREE) return false;
  return isPatientManuallyGrantedAccess({ plan, accessExpiresAt, approvalEmailSentAt });
}

/** Paciente com plano pago ou liberação manual ainda válida (entra no app). */
export function isPatientPaidAccessActive(
  plan?: UserPlan | string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  return (
    isPatientFullAccessActive(plan, accessExpiresAt, approvalEmailSentAt)
    || isPatientLimitedAccessActive(plan, accessExpiresAt, approvalEmailSentAt)
  );
}

/** Bloqueia o app até concluir ou renovar o pagamento (só cadastros novos sem liberação manual). */
export function isPatientAppAccessBlocked(
  plan?: UserPlan | string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  return !isPatientPaidAccessActive(plan, accessExpiresAt, approvalEmailSentAt);
}

/** Recursos premium (Bella, cursos, comunidade…) — exige plano pago ativo. */
export function isPatientPremiumFeatureBlocked(
  plan?: UserPlan | string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): boolean {
  return !isPatientFullAccessActive(plan, accessExpiresAt, approvalEmailSentAt);
}

/** Prefixos de API liberados no acesso limitado (FREE). */
export const PATIENT_LIMITED_API_PREFIXES = [
  "/api/auth",
  "/api/meal-plan",
  "/api/patient-goals",
  "/api/patient-profile",
  "/api/food-diary",
  "/api/foods",
  "/api/billing",
  "/api/notifications",
  "/api/push",
  "/api/patients",
];

export function isPatientLimitedApiPath(path: string): boolean {
  return PATIENT_LIMITED_API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function patientHadGrantedAccess(fields: PatientAccessFields): boolean {
  if (normalizedPlan(fields.plan) !== UserPlan.FREE) return true;
  if (fields.approvalEmailSentAt) return true;
  if (fields.accessExpiresAt) return true;
  return false;
}

export const PATIENT_PAYMENT_REQUIRED_MESSAGE =
  "Finalize sua assinatura para acessar o Clube Florescer.";

export const PATIENT_ACCESS_EXPIRED_RENEW_MESSAGE =
  "Sua assinatura expirou. Renove para continuar usando o app.";

export const PATIENT_PREMIUM_REQUIRED_MESSAGE =
  "Este recurso faz parte do plano Essencial ou Completo. Faça upgrade para liberar.";
