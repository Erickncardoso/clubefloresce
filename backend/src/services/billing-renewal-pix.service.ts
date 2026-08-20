import { randomUUID } from "crypto";
import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { isPixBillingPayer } from "../utils/billing-payment-method";
import { accessExpiresDateKey, renewalDateWindowKeys, renewalQueryWindow } from "../utils/billing-renewal-dates";
import { buildRenewalPixWhatsappText } from "../utils/billing-renewal-pix-message";
import { getPatientAppOpenUrl } from "../utils/email-config";
import { normalizePhoneForWhatsapp } from "../utils/phone";
import { mercadoPagoBillingService } from "./mercadopago-billing.service";
import { WhatsappService } from "./whatsapp.service";

const whatsappService = new WhatsappService();
const RENEWAL_PIX_TYPE = "renewal_pix" as const;

type RenewalUser = {
  id: string;
  name: string;
  phone?: string | null;
  billingPaymentMethod?: string | null;
  accessExpiresAt?: Date | null;
};

export class BillingRenewalPixService {
  async processDuePixRenewals(now = new Date()): Promise<void> {
    const { todayKey } = renewalDateWindowKeys(now);
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
        phone: true,
        billingPaymentMethod: true,
        accessExpiresAt: true,
      },
      take: 120,
    });

    for (const user of users) {
      if (!user.accessExpiresAt) continue;
      const expiryKey = accessExpiresDateKey(user.accessExpiresAt);
      if (expiryKey !== todayKey) continue;
      if (!(await isPixBillingPayer(user.id, user.billingPaymentMethod))) continue;
      await this.sendDuePix(user, expiryKey);
    }
  }

  private async shouldSkip(userId: string, expiryKey: string): Promise<boolean> {
    const row = await prisma.billingNotificationLog.findFirst({
      where: {
        userId,
        type: RENEWAL_PIX_TYPE,
        metadata: { path: ["expiryKey"], equals: expiryKey },
      },
      orderBy: { createdAt: "desc" },
      select: { status: true, createdAt: true },
    });
    if (!row) return false;
    if (row.status === "sent" || row.status === "skipped") return true;
    if (row.status === "failed" && Date.now() - row.createdAt.getTime() < 15 * 60_000) return true;
    return false;
  }

  private async log(input: {
    userId: string;
    status: "sent" | "failed" | "skipped";
    detail?: string;
    error?: string;
    metadata?: Record<string, unknown>;
  }) {
    await prisma.billingNotificationLog.create({
      data: {
        id: randomUUID(),
        userId: input.userId,
        channel: "whatsapp",
        type: RENEWAL_PIX_TYPE,
        status: input.status,
        detail: input.detail || null,
        error: input.error || null,
        metadata: input.metadata as any,
      },
    });
  }

  private async sendDuePix(user: RenewalUser, expiryKey: string): Promise<void> {
    if (await this.shouldSkip(user.id, expiryKey)) return;

    const number = normalizePhoneForWhatsapp(user.phone);
    if (!number) {
      await this.log({
        userId: user.id,
        status: "skipped",
        detail: "Telefone ausente",
        metadata: { expiryKey },
      });
      return;
    }

    const nutri = await prisma.user.findFirst({
      where: { role: Role.NUTRICIONISTA, status: { in: [UserStatus.ATIVO, UserStatus.PENDENTE] } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!nutri?.id) {
      await this.log({
        userId: user.id,
        status: "skipped",
        detail: "WhatsApp não configurado",
        metadata: { expiryKey },
      });
      return;
    }

    let generated: Awaited<ReturnType<typeof mercadoPagoBillingService.generateRenewalPixForUser>>;
    try {
      generated = await mercadoPagoBillingService.generateRenewalPixForUser(user.id, undefined, expiryKey);
    } catch (error: any) {
      await this.log({
        userId: user.id,
        status: "failed",
        error: error?.message || String(error),
        metadata: { expiryKey },
      });
      return;
    }

    if (!generated.ok) {
      await this.log({
        userId: user.id,
        status: "skipped",
        detail: generated.reason === "missing_cpf"
          ? "CPF do último Pix não encontrado"
          : generated.reason,
        metadata: { expiryKey, checkoutUrl: getPatientAppOpenUrl("billing", "/assinatura") },
      });
      return;
    }

    const pixCode = String(generated.pix?.qrCode || "").trim();
    if (!pixCode) {
      await this.log({
        userId: user.id,
        status: "failed",
        error: "Pix gerado sem código copia e cola",
        metadata: { expiryKey, paymentId: generated.paymentId },
      });
      return;
    }

    const firstName = user.name.split(" ")[0] || user.name;
    const text = buildRenewalPixWhatsappText({
      firstName,
      amount: generated.amount,
      pixCopyPaste: pixCode,
    });

    try {
      await whatsappService.sendText(nutri.id, {
        number,
        text,
        delay: 800,
      });
      await this.log({
        userId: user.id,
        status: "sent",
        detail: generated.reused ? "Pix reenviado" : "Pix de renovação enviado",
        metadata: { expiryKey, paymentId: generated.paymentId, amount: generated.amount },
      });
    } catch (error: any) {
      await this.log({
        userId: user.id,
        status: "failed",
        error: error?.message || String(error),
        metadata: { expiryKey, paymentId: generated.paymentId },
      });
    }
  }
}

export const billingRenewalPixService = new BillingRenewalPixService();
