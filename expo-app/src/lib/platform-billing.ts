import { Linking, Platform } from 'react-native';
import {
  isPatientFullAccessActive,
  PATIENT_ACCESS_EXPIRED_MESSAGE,
  PATIENT_PAYMENT_REQUIRED_MESSAGE,
} from '@/lib/patient-access';
import { SUBSCRIPTION_WEB_URL } from '@/config/legal';

/** iOS App Store: login + status in-app; sem checkout in-app (Guideline 3.1.1). */
export function usesNeutralSubscriptionScreen(): boolean {
  return Platform.OS === 'ios';
}

/** Android nativo ainda direciona checkout para o site; web usa Mercado Pago in-app. */
export function requiresWebSubscription(): boolean {
  return Platform.OS === 'android';
}

/** iOS sempre passa pela tela in-app antes de qualquer link externo. */
export function prefersInAppSubscriptionScreen(): boolean {
  return usesNeutralSubscriptionScreen();
}

export function shouldOpenSubscriptionOnWeb(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/** Abrir site direto do menu — só Android; iOS usa /assinatura. */
export function shouldOfferWebSubscription(hasFullAccess: boolean): boolean {
  return Platform.OS === 'android' && !hasFullAccess;
}

export async function openSubscriptionWebsite(): Promise<boolean> {
  const separator = SUBSCRIPTION_WEB_URL.includes('?') ? '&' : '?';
  const url = `${SUBSCRIPTION_WEB_URL}${separator}source=app`;
  try {
    const canOpen = await Linking.canOpenURL(url);
    await Linking.openURL(canOpen ? url : SUBSCRIPTION_WEB_URL);
    return true;
  } catch {
    try {
      await Linking.openURL(SUBSCRIPTION_WEB_URL);
      return true;
    } catch {
      return false;
    }
  }
}

/** Android pode listar planos com link externo; iOS só status (sem preços). */
export function showsExternalSubscriptionCatalog(): boolean {
  return Platform.OS === 'android';
}

export function getPaymentRequiredMessage(): string {
  if (usesNeutralSubscriptionScreen()) {
    return 'Seu acesso ainda não está ativo. Se você já possui assinatura, entre com sua conta ou aguarde a ativação.';
  }
  return PATIENT_PAYMENT_REQUIRED_MESSAGE;
}

export function getAccessExpiredMessage(): string {
  if (usesNeutralSubscriptionScreen()) {
    return 'Seu acesso expirou. Entre com sua conta ou fale conosco se precisar de ajuda.';
  }
  return PATIENT_ACCESS_EXPIRED_MESSAGE;
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
  if (usesNeutralSubscriptionScreen()) return 'Acesso limitado';
  return 'Acesso básico';
}

export function getSubscriptionScreenTitle(): string {
  return usesNeutralSubscriptionScreen() ? 'Status da assinatura' : 'Assinatura';
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
  if (usesNeutralSubscriptionScreen()) return 'Consultar status do acesso';
  return 'Toque para ver os planos';
}

export function getExternalWebsiteButtonLabel(): string {
  return usesNeutralSubscriptionScreen() ? 'Abrir site oficial' : 'Abrir site para assinar';
}

export function getSubscriptionPendingHeroSub(): string {
  if (usesNeutralSubscriptionScreen()) {
    return 'Entre com a mesma conta usada no site. Se o acesso já foi ativado, toque em Atualizar acesso abaixo.';
  }
  return 'Último passo para liberar dieta, Bella IA e check-ins no app.';
}

export function getSubscriptionActiveHeroSub(): string {
  if (usesNeutralSubscriptionScreen()) {
    return 'Confira o status do seu acesso ao Clube Florescer.';
  }
  return 'Mantenha seu acesso sem interrupção.';
}

export function getSubscriptionPendingCardText(): string {
  if (usesNeutralSubscriptionScreen()) {
    return 'O plano vinculado à sua conta é gerenciado no site oficial. Depois de ativar, volte aqui e toque em Atualizar acesso.';
  }
  return 'A contratação e renovação da assinatura do Clube Florescer são feitas pelo site. Depois de pagar, volte ao app e toque em atualizar acesso.';
}

export function getRegisterSubtitle(): string {
  if (usesNeutralSubscriptionScreen()) {
    return 'Crie sua conta para acompanhar seu progresso. O acesso completo é vinculado à sua conta após a ativação.';
  }
  return 'Crie sua conta no Clube Florescer. Para assinar, você será direcionado ao site oficial.';
}

export function getHomePreviewBannerTitle(): string {
  return 'Prévia do seu painel';
}

export function getHomePreviewBannerText(): string {
  return 'Você está vendo uma prévia do Início. Com acesso ativo, libere dieta, Bella IA, evolução e comunidade.';
}
