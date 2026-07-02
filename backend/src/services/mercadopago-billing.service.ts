import { randomUUID } from "crypto";
import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago";
import { UserPlan, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  getMercadoPagoAccessToken,
  getBillingWebhookUrl,
  getMercadoPagoSandboxPayerEmail,
  getPatientAppUrl,
  isBillingSandboxSimulateCard,
  isMercadoPagoConfigured,
  isMercadoPagoTestMode,
  resolveMercadoPagoPayerEmail,
} from "../utils/mercadopago-config";
import {
  addBillingPeriodDays,
  buildMercadoPagoWebhookEventKey,
  extractMercadoPagoWebhookResourceId,
} from "../utils/mercadopago-webhook";
import { billingPlanConfigService } from "./billing-plan-config.service";
import { billingNotificationService } from "./billing-notification.service";
import type { BillingProduct } from "../types/billing-product.types";

type PayerIdentification = {
  type?: string;
  number?: string;
};

type SubscribeCardInput = {
  userId: string;
  planId: unknown;
  cardToken: string;
  payerEmail: string;
  payerName?: string;
  identification?: PayerIdentification;
  installments?: number;
  paymentMethodId?: string;
  issuerId?: string;
};

type SubscribePixInput = {
  userId: string;
  planId: unknown;
  payerEmail: string;
  payerName?: string;
  identification?: PayerIdentification;
};

function getMpClient(): MercadoPagoConfig {
  const accessToken = getMercadoPagoAccessToken();
  if (!accessToken) {
    throw new Error("Mercado Pago não configurado. Defina MERCADOPAGO_ACCESS_TOKEN.");
  }
  return new MercadoPagoConfig({ accessToken });
}

function buildExternalReference(userId: string, planId: string): string {
  return `cf-sub-${userId}-${planId}-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function productAccessDays(product: BillingProduct): number {
  return billingPlanConfigService.getAccessPeriodDays(product);
}

function mapPreapprovalStatus(status?: string | null): string {
  const value = String(status || "").toLowerCase();
  if (value === "authorized" || value === "active") return "authorized";
  if (value === "paused") return "paused";
  if (value === "cancelled" || value === "canceled") return "cancelled";
  return "pending";
}

function mapPaymentStatus(status?: string | null): string {
  const value = String(status || "").toLowerCase();
  if (value === "approved") return "PAID";
  if (value === "cancelled" || value === "canceled" || value === "rejected") return "CANCELLED";
  return "PENDING";
}

function extractPixData(payment: any) {
  const tx = payment?.point_of_interaction?.transaction_data || {};
  return {
    qrCode: tx.qr_code || null,
    qrCodeBase64: tx.qr_code_base64 || null,
    ticketUrl: tx.ticket_url || null,
    expiresAt: payment?.date_of_expiration || null,
  };
}

function extractPaymentPreapprovalId(payment: any): string {
  const metadata = payment?.metadata;
  const fromMetadata = metadata && typeof metadata === "object"
    ? String((metadata as Record<string, unknown>).preapproval_id || "")
    : "";
  return String(
    payment?.preapproval_id
    || fromMetadata
    || payment?.point_of_interaction?.transaction_data?.subscription_id
    || "",
  ).trim();
}

function resolvePixIdentification(input: SubscribePixInput): { type: string; number: string } {
  const number = String(input.identification?.number || "").replace(/\D/g, "");
  if (isMercadoPagoTestMode()) {
    return {
      type: input.identification?.type || "CPF",
      number: number.length === 11 ? number : "12345678909",
    };
  }
  if (number.length !== 11) {
    throw new Error("Informe seu CPF para gerar o Pix.");
  }
  return { type: input.identification?.type || "CPF", number };
}

function buildPixPayer(input: SubscribePixInput, payerEmail: string) {
  const identification = resolvePixIdentification(input);
  return {
    email: payerEmail,
    first_name: isMercadoPagoTestMode() ? "APRO" : (input.payerName?.split(" ")[0] || undefined),
    last_name: isMercadoPagoTestMode() ? "TEST" : (input.payerName?.split(" ").slice(1).join(" ") || undefined),
    entity_type: "individual",
    type: "customer",
    identification,
  };
}

function buildPixPaymentBody(params: {
  amount: number;
  description: string;
  externalReference: string;
  payer: Record<string, unknown>;
  preapprovalId?: string;
}): Record<string, unknown> {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30);

  const body: Record<string, unknown> = {
    transaction_amount: params.amount,
    description: params.description,
    payment_method_id: "pix",
    external_reference: params.externalReference,
    date_of_expiration: expiresAt.toISOString(),
    payer: params.payer,
  };

  const notificationUrl = getBillingWebhookUrl();
  if (notificationUrl) {
    body.notification_url = notificationUrl;
  }

  if (params.preapprovalId) {
    body.metadata = {
      preapproval_id: params.preapprovalId,
      recurring: "true",
    };
  }

  return body;
}

async function createMercadoPagoPixPayment(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const client = getMpClient();
  const paymentApi = new Payment(client);
  try {
    const payment = await paymentApi.create({
      body: body as any,
      requestOptions: { idempotencyKey: randomUUID() },
    });
    return (payment || {}) as unknown as Record<string, unknown>;
  } catch (err: any) {
    const payload = err?.cause || err?.apiResponse || err;
    throw new Error(extractMercadoPagoApiError(payload, err?.message || "Não foi possível gerar o Pix."));
  }
}

function assertPixQrGenerated(payment: Record<string, unknown>): ReturnType<typeof extractPixData> {
  const pix = extractPixData(payment);
  if (!pix.qrCode && !pix.qrCodeBase64) {
    const status = String(payment?.status || "");
    const detail = String(payment?.status_detail || "");
    throw new Error(
      status || detail
        ? `Pix não gerado pelo Mercado Pago (${status}${detail ? ` — ${detail}` : ""}). Confira se a chave Pix está ativa na conta.`
        : "O Mercado Pago não retornou o QR Code Pix. Verifique se a chave Pix está ativa na conta do vendedor.",
    );
  }
  return pix;
}

function extractMercadoPagoApiError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload as Record<string, unknown>;
  const cause = Array.isArray(data.cause) ? data.cause : [];
  const causeMessage = cause
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const entry = item as Record<string, unknown>;
      return String(entry.description || entry.message || "").trim();
    })
    .filter(Boolean)
    .join(" ");
  return String(causeMessage || data.message || fallback);
}

function isInvalidUsersMpError(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const data = payload as Record<string, unknown>;
  const message = String(data.message || "").toLowerCase();
  if (message.includes("invalid users involved")) return true;
  const cause = Array.isArray(data.cause) ? data.cause : [];
  return cause.some((item) => {
    if (!item || typeof item !== "object") return false;
    const entry = item as Record<string, unknown>;
    const code = Number(entry.code || 0);
    const desc = String(entry.description || "").toLowerCase();
    return code === 145 || desc.includes("invalid users involved");
  });
}

function buildSandboxCardPayer(input: SubscribeCardInput, payerEmail: string) {
  return {
    email: payerEmail,
    first_name: "APRO",
    last_name: "TEST",
    identification: input.identification?.number
      ? {
          type: input.identification.type || "CPF",
          number: String(input.identification.number).replace(/\D/g, ""),
        }
      : { type: "CPF", number: "12345678909" },
  };
}

function extractPreapprovalInitPoint(response: Record<string, unknown> | null | undefined): string {
  if (!response) return "";
  return String(
    response.init_point
    || response.sandbox_init_point
    || "",
  ).trim();
}

async function createMercadoPagoPreApproval(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const client = getMpClient();
  const preApprovalApi = new PreApproval(client);
  try {
    const response = await preApprovalApi.create({
      body: body as any,
      requestOptions: { idempotencyKey: randomUUID() },
    });
    return (response || {}) as unknown as Record<string, unknown>;
  } catch (err: any) {
    const payload = err?.cause || err?.apiResponse || err;
    throw new Error(extractMercadoPagoApiError(payload, err?.message || "Não foi possível criar a assinatura no cartão."));
  }
}

export class MercadoPagoBillingService {
  ensureConfigured() {
    if (!isMercadoPagoConfigured()) {
      throw new Error("Mercado Pago não configurado.");
    }
  }

  async getPublicConfig() {
    const { getMercadoPagoPublicKey } = await import("../utils/mercadopago-config");
    const plans = await billingPlanConfigService.getPlanCatalog();
    const testMode = isMercadoPagoTestMode();
    return {
      enabled: isMercadoPagoConfigured(),
      testMode,
      publicKey: getMercadoPagoPublicKey(),
      currency: "BRL",
      plans,
      ...(testMode ? {
        sandboxPayerEmail: getMercadoPagoSandboxPayerEmail(),
        sandboxSimulateCard: isBillingSandboxSimulateCard(),
      } : {}),
    };
  }

  async getSubscriptionForUser(userId: string) {
    const [subscription, user] = await Promise.all([
      prisma.billingSubscription.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true, accessExpiresAt: true, status: true },
      }),
    ]);

    return {
      subscription,
      userPlan: user?.plan || UserPlan.FREE,
      accessExpiresAt: user?.accessExpiresAt || null,
      userStatus: user?.status || UserStatus.ATIVO,
    };
  }

  async subscribeWithCard(input: SubscribeCardInput) {
    const { product } = await billingPlanConfigService.resolvePlanAmount(input.planId);
    if (isMercadoPagoTestMode()) {
      return this.subscribeWithCardSandboxPayment(input);
    }
    if (!product.isSubscription) {
      return this.subscribeWithCardOneTimePayment(input);
    }
    return this.subscribeWithCardPreApproval(input);
  }

  private async subscribeWithCardOneTimePayment(input: SubscribeCardInput) {
    this.ensureConfigured();
    const { planId, amount, product } = await billingPlanConfigService.resolvePlanAmount(input.planId);
    const userPlan = billingPlanConfigService.toUserPlan(product);
    const accessDays = productAccessDays(product);
    const externalReference = buildExternalReference(input.userId, planId);
    const client = getMpClient();
    const paymentApi = new Payment(client);

    const payment = await paymentApi.create({
      body: {
        transaction_amount: amount,
        token: input.cardToken,
        description: product.description || `Clube Florescer — ${product.name}`,
        installments: input.installments || 1,
        external_reference: externalReference,
        payer: {
          email: input.payerEmail,
          first_name: input.payerName?.split(" ")[0] || undefined,
          last_name: input.payerName?.split(" ").slice(1).join(" ") || undefined,
          identification: input.identification?.number
            ? {
                type: input.identification.type || "CPF",
                number: String(input.identification.number).replace(/\D/g, ""),
              }
            : undefined,
        },
      },
      requestOptions: { idempotencyKey: randomUUID() },
    });

    const paymentId = String(payment?.id || "");
    const paymentStatus = mapPaymentStatus(payment?.status);
    const subscriptionStatus = paymentStatus === "PAID" ? "authorized" : "pending";

    const subscription = await prisma.billingSubscription.create({
      data: {
        userId: input.userId,
        plan: userPlan,
        status: subscriptionStatus,
        paymentMethod: "card",
        amount,
        nextBillingAt: null,
        rawPayload: { oneTimeCardPayment: true, payment } as any,
      },
    });

    await prisma.transaction.create({
      data: {
        userId: input.userId,
        amount,
        status: paymentStatus,
        plan: userPlan,
        paymentMethod: "card",
        mercadoPagoPaymentId: paymentId || null,
        externalReference,
      },
    });

    if (paymentStatus === "PAID") {
      await this.activateUserAccess(input.userId, userPlan, accessDays, "card");
    } else {
      void billingNotificationService.notifyPaymentFailed(input.userId).catch(() => {});
    }

    return {
      subscription,
      mercadoPagoPaymentId: paymentId,
      status: subscriptionStatus,
    };
  }

  /** Sandbox: cobrança avulsa aprovada com APRO (mesmo padrão do Pix). */
  private async subscribeWithCardSandboxPayment(input: SubscribeCardInput) {
    if (isBillingSandboxSimulateCard()) {
      return this.simulateSandboxCardPayment(input);
    }

    this.ensureConfigured();
    const { planId, amount, product } = await billingPlanConfigService.resolvePlanAmount(input.planId);
    const userPlan = billingPlanConfigService.toUserPlan(product);
    const accessDays = productAccessDays(product);
    const externalReference = buildExternalReference(input.userId, planId);
    const client = getMpClient();
    const paymentApi = new Payment(client);

    const payerEmails = [input.payerEmail, getMercadoPagoSandboxPayerEmail()]
      .map((email) => String(email || "").trim())
      .filter((email, index, list) => email && list.indexOf(email) === index);

    let payment: any;
    let mercadoPagoPayerEmail = payerEmails[0] || input.payerEmail;
    let lastError: any;

    for (const payerEmail of payerEmails) {
      const body: Record<string, unknown> = {
        transaction_amount: amount,
        token: input.cardToken,
        description: product.description || `Clube Florescer — ${product.name}`,
        installments: input.installments || 1,
        external_reference: externalReference,
        payer: buildSandboxCardPayer(input, payerEmail),
      };

      try {
        payment = await paymentApi.create({
          body,
          requestOptions: { idempotencyKey: randomUUID() },
        });
        mercadoPagoPayerEmail = payerEmail;
        break;
      } catch (err: any) {
        lastError = err;
        const payload = err?.cause || err?.apiResponse || err;
        if (!isInvalidUsersMpError(payload) || payerEmail === payerEmails[payerEmails.length - 1]) {
          break;
        }
      }
    }

    if (!payment) {
      const payload = lastError?.cause || lastError?.apiResponse || lastError;
      const message = extractMercadoPagoApiError(
        payload,
        lastError?.message || "Não foi possível processar o cartão de teste.",
      );
      if (isInvalidUsersMpError(payload)) {
        throw new Error(
          `${message} No sandbox do Mercado Pago, crie Contas de teste (vendedor + comprador) no painel e defina MERCADOPAGO_SANDBOX_PAYER_EMAIL com o e-mail do comprador de teste. Para dev local, use BILLING_SANDBOX_SIMULATE_CARD=true.`,
        );
      }
      throw new Error(message);
    }

    return this.persistSandboxCardPayment({
      input,
      planId,
      amount,
      userPlan,
      accessDays,
      externalReference,
      payment,
      mercadoPagoPayerEmail,
    });
  }

  private async simulateSandboxCardPayment(input: SubscribeCardInput) {
    const { planId, amount, product } = await billingPlanConfigService.resolvePlanAmount(input.planId);
    const userPlan = billingPlanConfigService.toUserPlan(product);
    const accessDays = productAccessDays(product);
    const externalReference = buildExternalReference(input.userId, planId);
    const fakePaymentId = `sim-${randomUUID()}`;

    return this.persistSandboxCardPayment({
      input,
      planId,
      amount,
      userPlan,
      accessDays,
      externalReference,
      payment: {
        id: fakePaymentId,
        status: "approved",
        simulated: true,
      },
      mercadoPagoPayerEmail: input.payerEmail,
      simulated: true,
    });
  }

  private async persistSandboxCardPayment(params: {
    input: SubscribeCardInput;
    planId: string;
    amount: number;
    userPlan: UserPlan;
    accessDays: number;
    externalReference: string;
    payment: any;
    mercadoPagoPayerEmail: string;
    simulated?: boolean;
  }) {
    const {
      input,
      amount,
      userPlan,
      accessDays,
      externalReference,
      payment,
      mercadoPagoPayerEmail,
      simulated = false,
    } = params;

    const paymentId = String(payment?.id || "");
    const paymentStatus = simulated ? "PAID" : mapPaymentStatus(payment?.status);
    const subscriptionStatus = paymentStatus === "PAID" ? "authorized" : "pending";

    const subscription = await prisma.billingSubscription.create({
      data: {
        userId: input.userId,
        plan: userPlan,
        status: subscriptionStatus,
        paymentMethod: "card",
        amount,
        nextBillingAt: subscriptionStatus === "authorized" ? addBillingPeriodDays(new Date(), accessDays) : null,
        rawPayload: {
          sandboxCardPayment: true,
          simulated,
          mercadoPagoPaymentId: paymentId || null,
          patientEmail: input.payerEmail,
          mercadoPagoPayerEmail,
          payment,
        } as any,
      },
    });

    await prisma.transaction.create({
      data: {
        userId: input.userId,
        amount,
        status: paymentStatus,
        plan: userPlan,
        paymentMethod: "card",
        mercadoPagoPaymentId: paymentId || null,
        externalReference,
        metadata: {
          sandboxCardPayment: true,
          simulated,
          patientEmail: input.payerEmail,
        },
      },
    });

    if (paymentStatus === "PAID") {
      await this.activateUserAccess(input.userId, userPlan, accessDays, "card");
    } else {
      void billingNotificationService.notifyPaymentFailed(input.userId).catch(() => {});
    }

    return {
      subscription,
      mercadoPagoPaymentId: paymentId,
      status: subscriptionStatus,
      sandboxMode: true,
      simulated,
    };
  }

  private async subscribeWithCardPreApproval(input: SubscribeCardInput) {
    this.ensureConfigured();
    const { planId, amount, product } = await billingPlanConfigService.resolvePlanAmount(input.planId);
    const userPlan = billingPlanConfigService.toUserPlan(product);
    const accessDays = productAccessDays(product);
    const externalReference = buildExternalReference(input.userId, planId);
    const startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() + 5);

    const mpPayerEmail = resolveMercadoPagoPayerEmail(input.payerEmail);

    const body = {
      reason: product.description || `Clube Florescer — ${product.name}`,
      external_reference: externalReference,
      payer_email: mpPayerEmail,
      card_token_id: input.cardToken,
      status: "authorized",
      back_url: `${getPatientAppUrl()}/assinatura?status=success`,
      auto_recurring: product.isSubscription
        ? {
            frequency: product.frequency,
            frequency_type: product.frequencyType,
            start_date: startDate.toISOString(),
            transaction_amount: amount,
            currency_id: "BRL",
          }
        : undefined,
    };

    const response = await createMercadoPagoPreApproval(body);
    const mpId = String(response.id || "");
    const status = mapPreapprovalStatus(String(response.status || ""));

    const subscription = await prisma.billingSubscription.create({
      data: {
        userId: input.userId,
        plan: userPlan,
        status,
        paymentMethod: "card",
        amount,
        mercadoPagoPreapprovalId: mpId || null,
        nextBillingAt: status === "authorized" ? addBillingPeriodDays(new Date(), accessDays) : null,
        rawPayload: response as any,
      },
    });

    await prisma.transaction.create({
      data: {
        userId: input.userId,
        amount,
        status: status === "authorized" ? "PAID" : "PENDING",
        plan: userPlan,
        paymentMethod: "card",
        mercadoPagoPreapprovalId: mpId || null,
        externalReference,
        metadata: {
          installments: input.installments || 1,
          paymentMethodId: input.paymentMethodId || null,
          issuerId: input.issuerId || null,
        },
      },
    });

    if (status === "authorized") {
      await this.activateUserAccess(input.userId, userPlan, accessDays, "card");
    } else {
      void billingNotificationService.notifyPaymentFailed(input.userId).catch(() => {});
    }

    return {
      subscription,
      mercadoPagoPreapprovalId: mpId,
      status,
    };
  }

  async subscribeWithPix(input: SubscribePixInput) {
    this.ensureConfigured();
    const { product } = await billingPlanConfigService.resolvePlanAmount(input.planId);
    if (product.isSubscription) {
      return this.subscribeWithPixRecurring(input);
    }
    return this.subscribeWithPixOneTime(input);
  }

  private async subscribeWithPixOneTime(input: SubscribePixInput) {
    const { planId, amount, product } = await billingPlanConfigService.resolvePlanAmount(input.planId);
    const userPlan = billingPlanConfigService.toUserPlan(product);
    const externalReference = buildExternalReference(input.userId, planId);
    const mpPayerEmail = resolveMercadoPagoPayerEmail(input.payerEmail);
    const description = product.description || `Clube Florescer — ${product.name}`;

    const payment = await createMercadoPagoPixPayment(buildPixPaymentBody({
      amount,
      description,
      externalReference,
      payer: buildPixPayer(input, mpPayerEmail),
    }));

    const paymentId = String(payment?.id || "");
    const pix = assertPixQrGenerated(payment);

    const subscription = await prisma.billingSubscription.create({
      data: {
        userId: input.userId,
        plan: userPlan,
        status: "pending",
        paymentMethod: "pix",
        amount,
        rawPayload: payment as any,
      },
    });

    await prisma.transaction.create({
      data: {
        userId: input.userId,
        amount,
        status: "PENDING",
        plan: userPlan,
        paymentMethod: "pix",
        mercadoPagoPaymentId: paymentId || null,
        externalReference,
        metadata: pix as any,
      },
    });

    return {
      subscription,
      paymentId,
      status: mapPaymentStatus(String(payment?.status || "")),
      pix,
      externalReference,
      isRecurring: false,
    };
  }

  /** Assinatura mensal via Pix Automático (Mercado Pago init_point). Fallback: Pix avulso só se MP recusar. */
  private async subscribeWithPixRecurring(input: SubscribePixInput) {
    const { planId, amount, product } = await billingPlanConfigService.resolvePlanAmount(input.planId);
    const userPlan = billingPlanConfigService.toUserPlan(product);
    const accessDays = productAccessDays(product);
    const externalReference = buildExternalReference(input.userId, planId);
    const mpPayerEmail = resolveMercadoPagoPayerEmail(input.payerEmail);
    const description = product.description || `Clube Florescer — ${product.name}`;
    const startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() + 5);

    let mpPreapprovalId = "";
    let initPoint = "";
    let preapprovalResponse: Record<string, unknown> | null = null;
    let recurringFallback = false;

    try {
      preapprovalResponse = await createMercadoPagoPreApproval({
        reason: description,
        external_reference: externalReference,
        payer_email: mpPayerEmail,
        status: "pending",
        back_url: `${getPatientAppUrl()}/assinatura?status=success`,
        auto_recurring: {
          frequency: product.frequency,
          frequency_type: product.frequencyType,
          start_date: startDate.toISOString(),
          transaction_amount: amount,
          currency_id: "BRL",
        },
      });
      mpPreapprovalId = String(preapprovalResponse.id || "");
      initPoint = extractPreapprovalInitPoint(preapprovalResponse);
      if (!initPoint) {
        throw new Error("Mercado Pago não retornou o link de autorização do Pix Automático.");
      }
    } catch (err: any) {
      recurringFallback = true;
      console.warn(
        "[Billing] Pix Automático indisponível — fallback Pix avulso:",
        err?.message || err,
      );
    }

    if (initPoint && !recurringFallback) {
      const subscription = await prisma.billingSubscription.create({
        data: {
          userId: input.userId,
          plan: userPlan,
          status: "pending",
          paymentMethod: "pix",
          amount,
          mercadoPagoPreapprovalId: mpPreapprovalId || null,
          rawPayload: {
            recurring: true,
            recurringFallback: false,
            preapproval: preapprovalResponse,
          } as any,
        },
      });

      await prisma.transaction.create({
        data: {
          userId: input.userId,
          amount,
          status: "PENDING",
          plan: userPlan,
          paymentMethod: "pix",
          mercadoPagoPreapprovalId: mpPreapprovalId || null,
          externalReference,
          metadata: {
            initPoint,
            recurring: true,
            recurringFallback: false,
            accessDays,
            flow: "pix_automatic",
          } as any,
        },
      });

      console.info("[Billing] Pix Automático — init_point gerado para assinatura", mpPreapprovalId);

      return {
        subscription,
        status: "pending",
        initPoint,
        isRecurring: true,
        recurringFallback: false,
        externalReference,
      };
    }

    const payment = await createMercadoPagoPixPayment(buildPixPaymentBody({
      amount,
      description,
      externalReference,
      payer: buildPixPayer(input, mpPayerEmail),
      preapprovalId: mpPreapprovalId || undefined,
    }));

    const paymentId = String(payment?.id || "");
    const pix = assertPixQrGenerated(payment);

    const subscription = await prisma.billingSubscription.create({
      data: {
        userId: input.userId,
        plan: userPlan,
        status: "pending",
        paymentMethod: "pix",
        amount,
        mercadoPagoPreapprovalId: mpPreapprovalId || null,
        rawPayload: {
          recurring: true,
          recurringFallback: true,
          preapproval: preapprovalResponse,
          firstPayment: payment,
        } as any,
      },
    });

    await prisma.transaction.create({
      data: {
        userId: input.userId,
        amount,
        status: "PENDING",
        plan: userPlan,
        paymentMethod: "pix",
        mercadoPagoPaymentId: paymentId || null,
        mercadoPagoPreapprovalId: mpPreapprovalId || null,
        externalReference,
        metadata: {
          ...pix,
          preapprovalId: mpPreapprovalId || null,
          initPoint: initPoint || null,
          recurring: true,
          recurringFallback: true,
          accessDays,
          flow: "pix_one_time_fallback",
        } as any,
      },
    });

    return {
      subscription,
      paymentId,
      status: mapPaymentStatus(String(payment?.status || "")),
      pix,
      initPoint: initPoint || undefined,
      isRecurring: true,
      recurringFallback: true,
      externalReference,
    };
  }

  async activateUserAccess(
    userId: string,
    plan: UserPlan,
    periodDays = 30,
    billingPaymentMethod?: string | null,
  ) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        status: UserStatus.ATIVO,
        accessExpiresAt: addBillingPeriodDays(new Date(), periodDays),
        ...(billingPaymentMethod ? { billingPaymentMethod } : {}),
      },
    });
    void billingNotificationService.notifyPaymentSuccess(userId).catch((err) => {
      console.warn("[Billing] notifyPaymentSuccess:", err?.message || err);
    });
  }

  async extendUserAccess(
    userId: string,
    plan: UserPlan,
    periodDays = 30,
    billingPaymentMethod?: string | null,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accessExpiresAt: true },
    });

    const base = user?.accessExpiresAt && user.accessExpiresAt.getTime() > Date.now()
      ? user.accessExpiresAt
      : new Date();

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        status: UserStatus.ATIVO,
        accessExpiresAt: addBillingPeriodDays(base, periodDays),
        ...(billingPaymentMethod ? { billingPaymentMethod } : {}),
      },
    });
    void billingNotificationService.notifyPaymentSuccess(userId).catch((err) => {
      console.warn("[Billing] notifyPaymentSuccess:", err?.message || err);
    });
  }

  async processWebhookNotification(payload: {
    query: Record<string, unknown>;
    body: Record<string, unknown>;
    headers: Record<string, unknown>;
  }) {
    const { topic, resourceId } = extractMercadoPagoWebhookResourceId(
      payload.query as any,
      payload.body,
    );

    const eventKey = buildMercadoPagoWebhookEventKey(
      topic,
      resourceId,
      String(payload.headers["x-request-id"] || ""),
    );

    const existing = await prisma.billingWebhookEvent.findUnique({ where: { eventKey } });
    if (existing) {
      return { duplicate: true, eventKey };
    }

    await prisma.billingWebhookEvent.create({
      data: {
        eventKey,
        topic,
        payload: payload.body as any,
      },
    });

    if (topic.includes("payment") || topic === "payment") {
      try {
        await this.syncPayment(resourceId);
      } catch (err: any) {
        console.warn("[Billing Webhook] syncPayment ignorado:", err?.message || err);
      }
    }

    if (topic.includes("preapproval") || topic.includes("subscription")) {
      try {
        await this.syncPreapproval(resourceId);
      } catch (err: any) {
        console.warn("[Billing Webhook] syncPreapproval ignorado:", err?.message || err);
      }
    }

    return { duplicate: false, eventKey, topic, resourceId };
  }

  async syncPayment(paymentId: string) {
    this.ensureConfigured();
    const client = getMpClient();
    const paymentApi = new Payment(client);
    const payment = await paymentApi.get({ id: paymentId });
    const status = mapPaymentStatus(payment?.status);
    const externalReference = String(payment?.external_reference || "");

    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { mercadoPagoPaymentId: paymentId },
          externalReference ? { externalReference } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (transaction) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status,
          mercadoPagoPaymentId: paymentId,
          metadata: payment as any,
        },
      });

      if (status === "PAID" && transaction.plan) {
        const paymentMethod = transaction.paymentMethod || null;
        await this.extendUserAccess(transaction.userId, transaction.plan, 30, paymentMethod);
        const subscriptionUpdate = {
          status: "authorized",
          nextBillingAt: addBillingPeriodDays(),
          rawPayload: payment as any,
        };
        await prisma.billingSubscription.updateMany({
          where: {
            userId: transaction.userId,
            paymentMethod: "pix",
            status: { in: ["pending", "authorized"] },
          },
          data: subscriptionUpdate,
        });
      }
      return;
    }

    const preapprovalId = extractPaymentPreapprovalId(payment);
    if (preapprovalId && status === "PAID") {
      await this.syncRecurringPixPayment(preapprovalId, payment, paymentId);
    }
  }

  private async syncRecurringPixPayment(
    preapprovalId: string,
    payment: any,
    paymentId: string,
  ) {
    const subscription = await prisma.billingSubscription.findFirst({
      where: { mercadoPagoPreapprovalId: preapprovalId },
    });
    if (!subscription) return;

    const existingTxn = await prisma.transaction.findFirst({
      where: { mercadoPagoPaymentId: paymentId },
    });
    if (!existingTxn) {
      await prisma.transaction.create({
        data: {
          userId: subscription.userId,
          amount: subscription.amount,
          status: "PAID",
          plan: subscription.plan,
          paymentMethod: "pix",
          mercadoPagoPaymentId: paymentId || null,
          mercadoPagoPreapprovalId: preapprovalId,
          externalReference: String(payment?.external_reference || ""),
          metadata: payment as any,
        },
      });
    }

    await this.extendUserAccess(subscription.userId, subscription.plan, 30, "pix");
    await prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "authorized",
        nextBillingAt: addBillingPeriodDays(),
        rawPayload: payment as any,
      },
    });
  }

  async syncPreapproval(preapprovalId: string) {
    this.ensureConfigured();
    const client = getMpClient();
    const preApprovalApi = new PreApproval(client);
    const preapproval = await preApprovalApi.get({ id: preapprovalId });
    const status = mapPreapprovalStatus(preapproval?.status);

    const subscription = await prisma.billingSubscription.findFirst({
      where: { mercadoPagoPreapprovalId: preapprovalId },
    });

    if (!subscription) return;

    await prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: {
        status,
        nextBillingAt: status === "authorized" ? addBillingPeriodDays() : subscription.nextBillingAt,
        rawPayload: preapproval as any,
      },
    });

    if (status === "authorized") {
      await this.extendUserAccess(subscription.userId, subscription.plan, 30, "pix");
      await prisma.transaction.updateMany({
        where: {
          userId: subscription.userId,
          mercadoPagoPreapprovalId: preapprovalId,
        },
        data: { status: "PAID" },
      });
    }
  }
}

export const mercadoPagoBillingService = new MercadoPagoBillingService();
