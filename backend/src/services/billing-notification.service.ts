import { randomUUID } from "crypto";
import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getPatientAppOpenUrl, getPatientAppUrl } from "../utils/email-config";
import { normalizePhoneForWhatsapp } from "../utils/phone";
import { isPatientPaidAccessActive } from "../utils/patient-paid-access";
import {
  accessExpiresDateKey,
  renewalDateWindowKeys,
  renewalQueryWindow,
} from "../utils/billing-renewal-dates";
import { dispatchEmail, emailService } from "./email/email.service";
import { WhatsappService } from "./whatsapp.service";

const whatsappService = new WhatsappService();

export type BillingNotificationType =
  | "payment_success"
  | "cart_abandoned_5m"
  | "cart_abandoned_15m"
  | "renewal_1d_before"
  | "renewal_1d_after"
  | "payment_failed";

type NotifyUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  plan?: string | null;
  accessExpiresAt?: Date | null;
};

export class BillingCheckoutSessionService {
  async touch(userId: string): Promise<void> {
    const open = await prisma.billingCheckoutSession.findFirst({
      where: { userId, completedAt: null },
      orderBy: { startedAt: "desc" },
    });

    if (open) {
      await prisma.billingCheckoutSession.update({
        where: { id: open.id },
        data: { lastSeenAt: new Date() },
      });
      return;
    }

    await prisma.billingCheckoutSession.create({
      data: { id: randomUUID(), userId },
    });
  }

  async markCompleted(userId: string): Promise<void> {
    await prisma.billingCheckoutSession.updateMany({
      where: { userId, completedAt: null },
      data: { completedAt: new Date() },
    });
  }
}

export class BillingNotificationService {
  private readonly checkoutSessions = new BillingCheckoutSessionService();

  async touchCheckout(userId: string): Promise<void> {
    await this.checkoutSessions.touch(userId);
  }

  private async getPrimaryNutritionistId(): Promise<string | null> {
    const nutri = await prisma.user.findFirst({
      where: { role: Role.NUTRICIONISTA, status: { in: [UserStatus.ATIVO, UserStatus.PENDENTE] } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    return nutri?.id || null;
  }

  private async loadUser(userId: string): Promise<NotifyUser | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        plan: true,
        accessExpiresAt: true,
      },
    });
  }

  private async logNotification(input: {
    userId: string;
    channel: "whatsapp" | "email";
    type: BillingNotificationType;
    status: "sent" | "failed" | "skipped";
    detail?: string;
    error?: string;
    metadata?: Record<string, unknown>;
  }) {
    await prisma.billingNotificationLog.create({
      data: {
        id: randomUUID(),
        userId: input.userId,
        channel: input.channel,
        type: input.type,
        status: input.status,
        detail: input.detail || null,
        error: input.error || null,
        metadata: input.metadata as any,
      },
    });
  }

  private formatAccessDate(value?: Date | null): string {
    if (!value) return "em breve";
    return value.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });
  }

  private async wasRenewalNotified(
    userId: string,
    channel: "whatsapp" | "email",
    type: "renewal_1d_before" | "renewal_1d_after",
    expiryKey: string,
  ): Promise<boolean> {
    const already = await prisma.billingNotificationLog.findFirst({
      where: {
        userId,
        channel,
        type,
        metadata: { path: ["expiryKey"], equals: expiryKey },
      },
      select: { id: true },
    });
    return Boolean(already);
  }

  private buildRenewalWhatsappText(input: {
    first: string;
    renewDate: string;
    checkout: string;
  }): string {
    const { first, renewDate, checkout } = input;
    return `Olá, *${first}*! 🌿\n\nSua assinatura do *Clube Florescer* vence *amanhã* (*${renewDate}*).\n\nQuando quiser renovar, é só acessar:\n${checkout}`;
  }

  private async sendRenewalReminder(
    user: NotifyUser,
    type: "renewal_1d_before" | "renewal_1d_after",
    expiryKey: string,
  ): Promise<void> {
    const first = this.firstName(user.name);
    const renewDate = this.formatAccessDate(user.accessExpiresAt);
    const checkout = this.checkoutUrl();

    // WhatsApp: apenas 1 lembrete (1 dia antes), sem Pix automático — evita spam.
    if (type === "renewal_1d_before" && !(await this.wasRenewalNotified(user.id, "whatsapp", type, expiryKey))) {
      const whatsappText = this.buildRenewalWhatsappText({ first, renewDate, checkout });
      const nutriUserId = await this.getPrimaryNutritionistId();

      if (nutriUserId && user.phone) {
        try {
          await this.sendWhatsapp(nutriUserId, user.phone, whatsappText);
          await this.logNotification({
            userId: user.id,
            channel: "whatsapp",
            type,
            status: "sent",
            detail: "Link de renovação enviado",
            metadata: { expiryKey },
          });
        } catch (error: any) {
          await this.logNotification({
            userId: user.id,
            channel: "whatsapp",
            type,
            status: "failed",
            error: error?.message || String(error),
            metadata: { expiryKey },
          });
        }
      } else {
        await this.logNotification({
          userId: user.id,
          channel: "whatsapp",
          type,
          status: "skipped",
          detail: !nutriUserId ? "WhatsApp não configurado" : "Telefone ausente",
          metadata: { expiryKey },
        });
      }
    }

    if (await this.wasRenewalNotified(user.id, "email", type, expiryKey)) return;

    try {
      await emailService.sendBillingRenewalReminder({
        name: user.name,
        email: user.email,
        accessExpiresAt: user.accessExpiresAt,
        checkoutUrl: checkout,
      });
      await this.logNotification({
        userId: user.id,
        channel: "email",
        type,
        status: "sent",
        metadata: { expiryKey },
      });
    } catch (error: any) {
      await this.logNotification({
        userId: user.id,
        channel: "email",
        type,
        status: "failed",
        error: error?.message || String(error),
        metadata: { expiryKey },
      });
    }
  }

  private async wasRecentlyNotified(
    userId: string,
    type: BillingNotificationType,
    withinMs: number,
  ): Promise<boolean> {
    const since = new Date(Date.now() - withinMs);
    const recent = await prisma.billingNotificationLog.findFirst({
      where: {
        userId,
        type,
        status: "sent",
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    return Boolean(recent);
  }

  private firstName(name: string): string {
    return name.split(" ")[0] || name;
  }

  /** Link de renovação/checkout — /abrir tenta abrir o PWA instalado antes de /assinatura. */
  private checkoutUrl(): string {
    return getPatientAppOpenUrl("billing", "/assinatura");
  }

  private async sendWhatsapp(nutriUserId: string, phone: string | null | undefined, text: string) {
    const number = normalizePhoneForWhatsapp(phone);
    if (!number) throw new Error("Telefone inválido ou ausente.");
    await whatsappService.sendText(nutriUserId, {
      number,
      text,
      linkPreview: true,
      linkPreviewTitle: "Clube Florescer",
      delay: 600,
    });
  }

  async notifyPaymentSuccess(userId: string): Promise<void> {
    const user = await this.loadUser(userId);
    if (!user || !isPatientPaidAccessActive(user.plan, user.accessExpiresAt)) return;
    if (await this.wasRecentlyNotified(userId, "payment_success", 6 * 60 * 60 * 1000)) return;

    await this.checkoutSessions.markCompleted(userId);

    const first = this.firstName(user.name);
    const accessUntil = this.formatAccessDate(user.accessExpiresAt);
    const appUrl = getPatientAppOpenUrl("payment-success", "/inicio");

    const whatsappText = `Olá, *${first}*! 🌿\n\nSeu pagamento foi confirmado e seu acesso ao *Clube Florescer* está liberado até *${accessUntil}*.\n\nToque para entrar no app:\n${appUrl}`;

    const nutriUserId = await this.getPrimaryNutritionistId();
    if (nutriUserId && user.phone) {
      try {
        await this.sendWhatsapp(nutriUserId, user.phone, whatsappText);
        await this.logNotification({
          userId,
          channel: "whatsapp",
          type: "payment_success",
          status: "sent",
          detail: "Pagamento confirmado",
        });
      } catch (error: any) {
        await this.logNotification({
          userId,
          channel: "whatsapp",
          type: "payment_success",
          status: "failed",
          error: error?.message || String(error),
        });
      }
    } else {
      await this.logNotification({
        userId,
        channel: "whatsapp",
        type: "payment_success",
        status: "skipped",
        detail: !nutriUserId ? "Nutricionista/WhatsApp não configurado" : "Telefone ausente",
      });
    }

    try {
      await emailService.sendBillingPaymentSuccess({
        name: user.name,
        email: user.email,
        accessExpiresAt: user.accessExpiresAt,
        appUrl,
      });
      await this.logNotification({
        userId,
        channel: "email",
        type: "payment_success",
        status: "sent",
      });
    } catch (error: any) {
      await this.logNotification({
        userId,
        channel: "email",
        type: "payment_success",
        status: "failed",
        error: error?.message || String(error),
      });
    }
  }

  async notifyPaymentFailed(userId: string, reason?: string): Promise<void> {
    const user = await this.loadUser(userId);
    if (!user) return;
    if (await this.wasRecentlyNotified(userId, "payment_failed", 12 * 60 * 60 * 1000)) return;

    const first = this.firstName(user.name);
    const checkout = this.checkoutUrl();
    const whatsappText = `Olá, *${first}*!\n\nNão conseguimos confirmar seu pagamento no Clube Florescer. Você pode tentar novamente quando quiser:\n${checkout}`;

    const nutriUserId = await this.getPrimaryNutritionistId();
    if (nutriUserId && user.phone) {
      try {
        await this.sendWhatsapp(nutriUserId, user.phone, whatsappText);
        await this.logNotification({
          userId,
          channel: "whatsapp",
          type: "payment_failed",
          status: "sent",
          detail: reason || "Pagamento não aprovado",
        });
      } catch (error: any) {
        await this.logNotification({
          userId,
          channel: "whatsapp",
          type: "payment_failed",
          status: "failed",
          error: error?.message || String(error),
        });
      }
    }

    try {
      await emailService.sendBillingPaymentFailed({
        name: user.name,
        email: user.email,
        checkoutUrl: checkout,
        reason,
      });
      await this.logNotification({
        userId,
        channel: "email",
        type: "payment_failed",
        status: "sent",
        detail: reason || undefined,
      });
    } catch (error: any) {
      await this.logNotification({
        userId,
        channel: "email",
        type: "payment_failed",
        status: "failed",
        error: error?.message || String(error),
      });
    }
  }

  private async sendCartReminder(
    userId: string,
    type: "cart_abandoned_5m" | "cart_abandoned_15m",
    sessionId: string,
  ): Promise<void> {
    const user = await this.loadUser(userId);
    if (!user) return;
    if (isPatientPaidAccessActive(user.plan, user.accessExpiresAt)) {
      await this.checkoutSessions.markCompleted(userId);
      return;
    }

    const first = this.firstName(user.name);
    const checkout = this.checkoutUrl();
    const isSecond = type === "cart_abandoned_15m";
    const whatsappText = isSecond
      ? `Oi, *${first}*! Ainda dá tempo de concluir sua assinatura no Clube Florescer 🌿\n\nFinalize aqui:\n${checkout}`
      : `Oi, *${first}*! Vi que você começou sua assinatura no Clube Florescer e ainda não finalizou.\n\nQuando quiser, é só concluir aqui:\n${checkout}`;

    const nutriUserId = await this.getPrimaryNutritionistId();

    if (nutriUserId && user.phone) {
      try {
        await this.sendWhatsapp(nutriUserId, user.phone, whatsappText);
        await this.logNotification({ userId, channel: "whatsapp", type, status: "sent" });
      } catch (error: any) {
        await this.logNotification({
          userId,
          channel: "whatsapp",
          type,
          status: "failed",
          error: error?.message || String(error),
        });
      }
    }

    try {
      await emailService.sendBillingCartReminder({
        name: user.name,
        email: user.email,
        checkoutUrl: checkout,
        reminderKind: isSecond ? "15m" : "5m",
      });
      await this.logNotification({ userId, channel: "email", type, status: "sent" });
    } catch (error: any) {
      await this.logNotification({
        userId,
        channel: "email",
        type,
        status: "failed",
        error: error?.message || String(error),
      });
    }

    await prisma.billingCheckoutSession.update({
      where: { id: sessionId },
      data: isSecond ? { reminder15SentAt: new Date() } : { reminder5SentAt: new Date() },
    });
  }

  async processCartAbandonmentReminders(now = new Date()): Promise<void> {
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const due5 = await prisma.billingCheckoutSession.findMany({
      where: {
        completedAt: null,
        reminder5SentAt: null,
        startedAt: { lte: fiveMinAgo },
      },
      take: 40,
    });

    for (const session of due5) {
      await this.sendCartReminder(session.userId, "cart_abandoned_5m", session.id);
    }

    const due15 = await prisma.billingCheckoutSession.findMany({
      where: {
        completedAt: null,
        reminder5SentAt: { not: null },
        reminder15SentAt: null,
        startedAt: { lte: fifteenMinAgo },
      },
      take: 40,
    });

    for (const session of due15) {
      await this.sendCartReminder(session.userId, "cart_abandoned_15m", session.id);
    }
  }

  async processRenewalReminders(now = new Date()): Promise<void> {
    const { tomorrowKey, yesterdayKey } = renewalDateWindowKeys(now);
    const window = renewalQueryWindow(now);

    const users = await prisma.user.findMany({
      where: {
        role: Role.PACIENTE,
        status: UserStatus.ATIVO,
        accessExpiresAt: { not: null, gte: window.gte, lte: window.lte },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        plan: true,
        accessExpiresAt: true,
      },
      take: 120,
    });

    for (const user of users) {
      if (!user.accessExpiresAt) continue;

      const expiryKey = accessExpiresDateKey(user.accessExpiresAt);

      if (expiryKey === tomorrowKey) {
        await this.sendRenewalReminder(user, "renewal_1d_before", expiryKey);
      }

      if (expiryKey === yesterdayKey) {
        await this.sendRenewalReminder(user, "renewal_1d_after", expiryKey);
      }
    }
  }

  async listAdminLogs(limit = 80) {
    return prisma.billingNotificationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(200, Math.max(1, limit)),
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }
}

export const billingNotificationService = new BillingNotificationService();
