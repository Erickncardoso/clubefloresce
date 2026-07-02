import { Role, UserPlan, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { isValidWhatsappPhone } from "../utils/phone";

function normalizeBillingPaymentMethod(value?: string | null): string | null {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "pix" || normalized === "card") return normalized;
  return null;
}

const patientSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  plan: true,
  accessExpiresAt: true,
  billingPaymentMethod: true,
  approvalEmailSentAt: true,
  approvalWhatsappSentAt: true,
  approvalWhatsappMessage: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class UserMgmtRepository {
  async getAllUsers() {
    const users = await prisma.user.findMany({
      select: {
        ...patientSelect,
        updatedAt: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!users.length) return users;

    const userIds = users.map((user) => user.id);
    const subscriptions = await prisma.billingSubscription.findMany({
      where: { userId: { in: userIds } },
      orderBy: { updatedAt: "desc" },
      select: {
        userId: true,
        paymentMethod: true,
        status: true,
      },
    });

    const latestSubscriptionByUser = new Map<string, { paymentMethod: string | null; status: string }>();
    for (const subscription of subscriptions) {
      if (!latestSubscriptionByUser.has(subscription.userId)) {
        latestSubscriptionByUser.set(subscription.userId, {
          paymentMethod: subscription.paymentMethod,
          status: subscription.status,
        });
      }
    }

    return users.map((user) => {
      const latest = latestSubscriptionByUser.get(user.id);
      return {
        ...user,
        billingSubscriptionPaymentMethod: latest?.paymentMethod || null,
        billingSubscriptionStatus: latest?.status || null,
      };
    });
  }

  async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: patientSelect,
    });
  }

  async createPatient(data: {
    name: string;
    email: string;
    password: string;
    phone?: string | null;
    plan?: UserPlan;
    status?: UserStatus;
    accessExpiresAt?: Date | null;
    billingPaymentMethod?: string | null;
  }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone ?? null,
        role: Role.PACIENTE,
        plan: data.plan || UserPlan.FREE,
        status: data.status || UserStatus.ATIVO,
        accessExpiresAt: data.accessExpiresAt ?? null,
        billingPaymentMethod: normalizeBillingPaymentMethod(data.billingPaymentMethod),
      },
      select: {
        ...patientSelect,
        updatedAt: false,
      },
    });
  }

  async updatePatient(
    id: string,
    data: {
      name?: string;
      phone?: string | null;
      status?: UserStatus;
      plan?: UserPlan;
      accessExpiresAt?: Date | null;
      billingPaymentMethod?: string | null;
    },
  ) {
    return prisma.user.update({
      where: { id },
      data: {
        ...data,
        ...(data.billingPaymentMethod !== undefined
          ? { billingPaymentMethod: normalizeBillingPaymentMethod(data.billingPaymentMethod) }
          : {}),
      },
      select: patientSelect,
    });
  }

  async updateUserStatus(id: string, status: UserStatus) {
    return prisma.user.update({
      where: { id },
      data: { status },
      select: patientSelect,
    });
  }

  async markApprovalEmailSent(id: string) {
    return prisma.user.update({
      where: { id },
      data: { approvalEmailSentAt: new Date() },
      select: patientSelect,
    });
  }

  async markApprovalWhatsappSent(id: string) {
    return prisma.user.update({
      where: { id },
      data: { approvalWhatsappSentAt: new Date() },
      select: patientSelect,
    });
  }

  async updateApprovalWhatsappMessage(id: string, message: string | null) {
    return prisma.user.update({
      where: { id },
      data: { approvalWhatsappMessage: message },
      select: patientSelect,
    });
  }

  async listPendingApprovalWhatsappPatients() {
    return prisma.user.findMany({
      where: {
        role: Role.PACIENTE,
        status: UserStatus.ATIVO,
        approvalWhatsappSentAt: null,
        phone: { not: null },
      },
      select: patientSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  async syncPhonesFromRegistrationRequests() {
    const usersWithoutPhone = await prisma.user.findMany({
      where: {
        role: Role.PACIENTE,
        OR: [{ phone: null }, { phone: "" }],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const synced: Array<{ id: string; name: string; email: string; phone: string }> = [];
    const skipped: Array<{ id: string; name: string; email: string; reason: string }> = [];

    for (const user of usersWithoutPhone) {
      const request = await prisma.patientRegistrationRequest.findFirst({
        where: {
          email: user.email,
          phone: { not: null },
          NOT: { phone: "" },
        },
        orderBy: { createdAt: "desc" },
        select: { phone: true },
      });

      const phone = request?.phone?.trim() || "";
      if (!phone) {
        skipped.push({ ...user, reason: "Sem WhatsApp na solicitação" });
        continue;
      }

      if (!isValidWhatsappPhone(phone)) {
        skipped.push({ ...user, reason: "WhatsApp inválido na solicitação" });
        continue;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { phone },
      });

      synced.push({ ...user, phone });
    }

    return {
      checkedCount: usersWithoutPhone.length,
      syncedCount: synced.length,
      skippedCount: skipped.length,
      synced,
      skipped,
    };
  }

  async deleteUser(id: string) {
    return prisma.user.delete({ where: { id } });
  }
}
