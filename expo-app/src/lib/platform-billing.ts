import { isPatientFullAccessActive, isPatientAccessExpired } from '@/lib/patient-access';

/**
 * Copy de acesso no app nativo — sem linguagem de assinatura, pagamento ou planos comerciais.
 * O acesso é apresentado como liberação pela nutricionista (Guideline 3.1.1).
 */

export function formatAccessUntilDate(accessExpiresAt?: Date | string | null): string | null {
  if (!accessExpiresAt) return null;
  const date = new Date(accessExpiresAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR');
}

export function getNutritionistAccessMessage(
  hasFullAccess: boolean,
  accessExpiresAt?: Date | string | null,
  accessExpired = false,
): string {
  if (accessExpired) {
    return 'Seu acesso expirou. Fale com sua nutricionista se precisar de ajuda.';
  }
  if (hasFullAccess) {
    const until = formatAccessUntilDate(accessExpiresAt);
    if (until) {
      return `Acesso liberado pela nutricionista até ${until}`;
    }
    return 'Acesso liberado pela nutricionista';
  }
  return 'Aguardando liberação pela nutricionista';
}

export function getPaymentRequiredMessage(): string {
  return 'Seu acesso ainda não está ativo. Aguarde a liberação pela sua nutricionista ou fale conosco.';
}

export function getAccessExpiredMessage(): string {
  return 'Seu acesso expirou. Fale com sua nutricionista se precisar de ajuda.';
}

export function getAccessStatusLabel(
  plan?: string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): string {
  const expired = isPatientAccessExpired(accessExpiresAt);
  const hasFullAccess = isPatientFullAccessActive(plan, accessExpiresAt, approvalEmailSentAt);
  return getNutritionistAccessMessage(hasFullAccess, accessExpiresAt, expired);
}

export function getSubscriptionScreenTitle(): string {
  return 'Meu acesso';
}

export function getSubscriptionMenuLabel(): string {
  return getSubscriptionScreenTitle();
}

export function getSubscriptionMenuSubtitle(
  hasPaidAccess: boolean,
  accessExpiresAt?: Date | string | null,
): string {
  if (!hasPaidAccess) return 'Consultar meu acesso';
  const expired = isPatientAccessExpired(accessExpiresAt);
  return getNutritionistAccessMessage(true, accessExpiresAt, expired);
}

export function getRegisterSubtitle(): string {
  return 'Crie sua conta para acompanhar seu progresso com a nutricionista.';
}
