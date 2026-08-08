import { isPatientFullAccessActive } from '@/lib/patient-access';

/**
 * O app nativo (iOS/Android) nunca vende nem exibe planos/preços — só reflete o status
 * de acesso vindo da API. A assinatura é feita exclusivamente pelo site (Guideline 3.1.1).
 */

export function getPaymentRequiredMessage(): string {
  return 'Seu acesso ainda não está ativo. Se você já possui assinatura, entre com sua conta ou aguarde a ativação.';
}

export function getAccessExpiredMessage(): string {
  return 'Seu acesso expirou. Entre com sua conta ou fale conosco se precisar de ajuda.';
}

export function getAccessStatusLabel(
  plan?: string | null,
  accessExpiresAt?: Date | string | null,
  approvalEmailSentAt?: Date | string | null,
): string {
  if (isPatientFullAccessActive(plan, accessExpiresAt, approvalEmailSentAt)) {
    const normalized = String(plan || '').toUpperCase();
    if (normalized === 'PLATINUM') return 'Plano Completo';
    if (normalized === 'PREMIUM' || normalized === 'ESSENTIAL') return 'Plano Essencial';
    return 'Assinatura ativa';
  }
  return 'Acesso limitado';
}

export function getSubscriptionScreenTitle(): string {
  return 'Status da assinatura';
}

export function getSubscriptionMenuLabel(): string {
  return getSubscriptionScreenTitle();
}

export function getSubscriptionMenuSubtitle(
  hasPaidAccess: boolean,
  accessExpiresAt?: Date | string | null,
): string {
  if (hasPaidAccess && accessExpiresAt) {
    const date = new Date(accessExpiresAt);
    if (!Number.isNaN(date.getTime())) {
      return `Acesso até ${date.toLocaleDateString('pt-BR')}`;
    }
  }
  if (hasPaidAccess) return 'Assinatura ativa';
  return 'Consultar status do acesso';
}

export function getRegisterSubtitle(): string {
  return 'Crie sua conta para acompanhar seu progresso. O acesso completo é vinculado à sua conta após a ativação.';
}
