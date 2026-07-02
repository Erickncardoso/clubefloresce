import { Request, Response } from "express";
import { mercadoPagoBillingService } from "../services/mercadopago-billing.service";
import { billingPlanConfigService } from "../services/billing-plan-config.service";
import { billingNotificationService } from "../services/billing-notification.service";
import { verifyMercadoPagoWebhookSignature } from "../utils/mercadopago-webhook";
import { mapBillingErrorMessage } from "../utils/billing-user-messages";
import { prisma } from "../lib/prisma";

export class BillingController {
  getConfig = async (req: Request, res: Response) => {
    try {
      if (req.user?.id) {
        void billingNotificationService.touchCheckout(req.user.id).catch(() => {});
      }
      const config = await mercadoPagoBillingService.getPublicConfig();
      let payer: { id: string; email: string; name: string } | undefined;
      if (req.user?.id) {
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { id: true, email: true, name: true },
        });
        if (user) {
          payer = { id: user.id, email: user.email, name: user.name };
        }
      }
      res.json({
        ...config,
        payer,
      });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Não foi possível carregar a configuração de pagamento." });
    }
  };

  getMySubscription = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const data = await mercadoPagoBillingService.getSubscriptionForUser(userId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Não foi possível carregar sua assinatura." });
    }
  };

  subscribeCard = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const {
        planId,
        cardToken,
        payerEmail,
        payerName,
        identification,
        installments,
        paymentMethodId,
        issuerId,
      } = req.body || {};

      const account = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      const resolvedEmail = String(account?.email || payerEmail || req.user!.email || "").trim();
      const resolvedToken = String(cardToken || "").trim();

      if (!resolvedToken || !resolvedEmail) {
        return res.status(400).json({ message: "Token do cartão e e-mail são obrigatórios." });
      }

      const result = await mercadoPagoBillingService.subscribeWithCard({
        userId,
        planId,
        cardToken: resolvedToken,
        payerEmail: resolvedEmail,
        payerName: payerName ? String(payerName) : account?.name || undefined,
        identification,
        installments: Number(installments) || 1,
        paymentMethodId: paymentMethodId ? String(paymentMethodId) : undefined,
        issuerId: issuerId ? String(issuerId) : undefined,
      });

      res.status(201).json(result);
    } catch (err: any) {
      const friendly = mapBillingErrorMessage(err?.message);
      if (req.user?.id) {
        void billingNotificationService.notifyPaymentFailed(req.user.id, friendly).catch(() => {});
      }
      res.status(400).json({ message: friendly });
    }
  };

  subscribePix = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { planId, payerEmail, payerName, identification } = req.body || {};

      const account = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      const resolvedEmail = String(account?.email || payerEmail || req.user!.email || "").trim();
      if (!resolvedEmail) {
        return res.status(400).json({ message: "E-mail do pagador é obrigatório." });
      }

      const result = await mercadoPagoBillingService.subscribeWithPix({
        userId,
        planId,
        payerEmail: resolvedEmail,
        payerName: payerName ? String(payerName) : account?.name || undefined,
        identification,
      });

      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ message: mapBillingErrorMessage(err?.message || "Não foi possível gerar o Pix.") });
    }
  };

  webhook = async (req: Request, res: Response) => {
    try {
      const valid = verifyMercadoPagoWebhookSignature(
        {
          "x-signature": String(req.headers["x-signature"] || ""),
          "x-request-id": String(req.headers["x-request-id"] || ""),
        },
        req.query as any,
        (req.body || {}) as Record<string, unknown>,
      );

      if (!valid) {
        return res.status(401).json({ message: "Assinatura de webhook inválida." });
      }

      const result = await mercadoPagoBillingService.processWebhookNotification({
        query: req.query as Record<string, unknown>,
        body: (req.body || {}) as Record<string, unknown>,
        headers: req.headers as Record<string, unknown>,
      });

      res.status(200).json({ ok: true, ...result });
    } catch (err: any) {
      console.error("[Billing Webhook]", err?.message || err);
      res.status(500).json({ message: "Erro ao processar webhook." });
    }
  };

  getAdminProducts = async (_req: Request, res: Response) => {
    try {
      const products = await billingPlanConfigService.getProducts();
      res.json({ products });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Não foi possível carregar os produtos." });
    }
  };

  updateAdminProducts = async (req: Request, res: Response) => {
    try {
      const { products } = req.body || {};
      if (!Array.isArray(products)) {
        return res.status(400).json({ message: "Informe a lista de produtos." });
      }

      const updated = await billingPlanConfigService.saveProducts(products);
      res.json({ products: updated });
    } catch (err: any) {
      res.status(400).json({ message: err?.message || "Não foi possível salvar os produtos." });
    }
  };

  getAdminPlans = async (_req: Request, res: Response) => {
    try {
      const plans = await billingPlanConfigService.getAdminPlanSettings();
      res.json({ plans });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Não foi possível carregar os planos." });
    }
  };

  updateAdminPlans = async (req: Request, res: Response) => {
    try {
      const { plans } = req.body || {};
      if (!plans || typeof plans !== "object") {
        return res.status(400).json({ message: "Informe os valores dos planos." });
      }

      const updated = await billingPlanConfigService.updateAdminPlanSettings(plans);
      res.json({ plans: updated });
    } catch (err: any) {
      res.status(400).json({ message: err?.message || "Não foi possível atualizar os planos." });
    }
  };

  getFinancialSummary = async (_req: Request, res: Response) => {
    try {
      const transactions = await prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      const totalRevenue = transactions.reduce((acc, curr) => (
        curr.status === "PAID" ? acc + curr.amount : acc
      ), 0);

      const activeMembers = await prisma.user.count({
        where: { role: "PACIENTE", status: "ATIVO", plan: { not: "FREE" } },
      });

      const paidCount = transactions.filter((tx) => tx.status === "PAID").length;
      const averageTicket = paidCount ? totalRevenue / paidCount : 0;

      res.json({
        totalRevenue,
        activeMembers,
        averageTicket,
        growth: 0,
        recentTransactions: transactions.slice(0, 10).map((tx) => ({
          id: tx.id,
          amount: tx.amount,
          status: tx.status,
          plan: tx.plan,
          paymentMethod: tx.paymentMethod,
          createdAt: tx.createdAt,
          simulated: Boolean((tx.metadata as Record<string, unknown> | null)?.simulated),
          user: tx.user,
        })),
      });
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar resumo financeiro." });
    }
  };

  getAdminNotificationLogs = async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 80;
      const logs = await billingNotificationService.listAdminLogs(limit);
      res.json({ logs });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Não foi possível carregar os logs." });
    }
  };
}
