import { Prisma, Role, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { NotificationRepository } from "../repositories/notification.repository";
import { isPatientAccessExpired } from "../utils/access-expires";
import {
  type AdminPushCampaignInput,
  cleanPushText,
  mapInChunks,
  parseActionPath,
  parseAudience,
  parseButton,
  parseImageUrl,
  parsePushBody,
  parseScheduledAt,
  parseType,
  parseUserIds,
  profileGender,
} from "./admin-push.helpers";
import { PushNotificationService } from "./push-notification.service";

const repo = new NotificationRepository();
const pushService = new PushNotificationService();

export type { AdminPushCampaignInput };

export class AdminPushService {
  async sendToPatient(input: AdminPushCampaignInput & { userId: string }) {
    return this.createCampaign({
      ...input,
      audience: "one",
      userIds: [input.userId],
    });
  }

  async createCampaign(input: AdminPushCampaignInput) {
    const authorId = String(input.authorId || "").trim();
    if (!authorId) throw new Error("Nutricionista não identificada.");

    const title = cleanPushText(input.title) || "Isabella Jardim";
    const body = parsePushBody(input.body);
    const selectedIds = parseUserIds(input.userIds);
    if (input.userId) selectedIds.unshift(String(input.userId).trim());
    const uniqueIds = [...new Set(selectedIds.filter(Boolean))];

    const audience = parseAudience(input.audience, uniqueIds[0], uniqueIds);
    const type = parseType(input.type);
    const actionPath = parseActionPath(input.actionPath);
    const imageUrl = parseImageUrl(input.imageUrl);
    const button = parseButton(input.buttonKey);
    const scheduledAt = parseScheduledAt(input.scheduledAt);
    const userIds = await this.resolveAudience(audience, uniqueIds);
    if (!userIds.length) {
      throw new Error(
        audience === "female" || audience === "male"
          ? "Nenhuma paciente ativa com esse sexo no cadastro."
          : "Nenhuma paciente nesta audiência.",
      );
    }

    const shouldSchedule = Boolean(scheduledAt && scheduledAt.getTime() > Date.now() + 30_000);
    const storedIds = audience === "one" || audience === "selected" ? uniqueIds : [];

    const campaign = await prisma.adminPushCampaign.create({
      data: {
        authorId,
        title,
        body,
        type,
        actionPath,
        imageUrl,
        buttonKey: button.buttonKey,
        categoryId: button.categoryId,
        audience,
        userIds: storedIds,
        scheduledAt: shouldSchedule ? scheduledAt! : new Date(),
        status: "pending",
      },
    });

    if (shouldSchedule) {
      return {
        ok: true,
        scheduled: true,
        campaignId: campaign.id,
        scheduledAt: campaign.scheduledAt.toISOString(),
        recipients: userIds.length,
        message: `Programada para ${campaign.scheduledAt.toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        })}.`,
      };
    }

    if (userIds.length === 1) {
      const result = await this.dispatchCampaign(campaign.id);
      return {
        ok: true,
        scheduled: false,
        campaignId: campaign.id,
        notificationId: campaign.id,
        recipients: result.recipients,
        devices: result.devices,
        sent: result.sent,
        failed: result.failed,
        message: result.sent
          ? "Push enviada. Deve aparecer no celular em instantes."
          : "Aviso salvo no app. A paciente ainda não ativou notificações neste aparelho.",
      };
    }

    void this.dispatchCampaign(campaign.id).catch((error) => {
      console.error("[AdminPush] Falha no disparo:", campaign.id, error);
    });

    return {
      ok: true,
      scheduled: false,
      queued: true,
      campaignId: campaign.id,
      recipients: userIds.length,
      devices: userIds.length,
      sent: 0,
      failed: 0,
      message: `Enviando para ${userIds.length} paciente(s). Acompanhe na lista abaixo.`,
    };
  }

  async listCampaigns(authorId: string) {
    const rows = await prisma.adminPushCampaign.findMany({
      where: { authorId },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      type: row.type,
      actionPath: row.actionPath,
      imageUrl: row.imageUrl,
      buttonKey: row.buttonKey,
      audience: row.audience,
      userIds: parseUserIds(row.userIds),
      scheduledAt: row.scheduledAt.toISOString(),
      sentAt: row.sentAt?.toISOString() || null,
      status: row.status,
      result: row.resultJson,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async cancelCampaign(authorId: string, campaignId: string) {
    const existing = await prisma.adminPushCampaign.findFirst({
      where: { id: campaignId, authorId, status: "pending" },
    });
    if (!existing) throw new Error("Agendamento não encontrado.");

    await prisma.adminPushCampaign.update({
      where: { id: campaignId },
      data: { status: "cancelled" },
    });

    return { ok: true, message: "Agendamento cancelado." };
  }

  async processDueCampaigns() {
    const due = await prisma.adminPushCampaign.findMany({
      where: {
        status: "pending",
        scheduledAt: { lte: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
      take: 8,
    });

    let processed = 0;
    for (const row of due) {
      try {
        await this.dispatchCampaign(row.id);
        processed += 1;
      } catch (error) {
        console.error("[AdminPush] Falha no disparo programado:", row.id, error);
      }
    }
    return { processed };
  }

  async dispatchCampaign(campaignId: string) {
    const claimed = await prisma.adminPushCampaign.updateMany({
      where: { id: campaignId, status: "pending" },
      data: { status: "sending" },
    });

    if (claimed.count === 0) {
      const existing = await prisma.adminPushCampaign.findUnique({ where: { id: campaignId } });
      if (existing?.status === "sent") {
        const result = (existing.resultJson || {}) as {
          recipients?: number;
          sent?: number;
          failed?: number;
          devices?: number;
        };
        return {
          recipients: result.recipients || 0,
          sent: result.sent || 0,
          failed: result.failed || 0,
          devices: result.devices || 0,
        };
      }
      throw new Error("Campanha indisponível.");
    }

    const campaign = await prisma.adminPushCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error("Campanha não encontrada.");

    const userIds = await this.resolveAudience(campaign.audience, parseUserIds(campaign.userIds));
    let sent = 0;
    let failed = 0;

    await mapInChunks(userIds, 12, async (userId) => {
      const sourceKey = `nutri-push:${campaign.id}:${userId}`;
      try {
        const already = await prisma.notification.findUnique({
          where: { userId_sourceKey: { userId, sourceKey } },
        });
        if (already) return;

        const notification = await repo.createWithoutPush({
          userId,
          type: campaign.type,
          title: campaign.title,
          body: campaign.body,
          actionPath: campaign.actionPath,
          imageUrl: campaign.imageUrl,
          sourceKey,
        });

        const push = await pushService.sendToUser(userId, {
          title: campaign.title,
          body: campaign.body,
          url: campaign.actionPath,
          tag: notification.id,
          imageUrl: campaign.imageUrl,
          categoryId: campaign.categoryId,
          buttonLabel: parseButton(campaign.buttonKey).label,
          type: campaign.type,
        });
        sent += push.sent;
        failed += push.failed;
      } catch (error) {
        failed += 1;
        console.warn("[AdminPush] Paciente", userId, error);
      }
    });

    const result = {
      recipients: userIds.length,
      sent,
      failed,
      devices: sent + failed,
    };

    await prisma.adminPushCampaign.update({
      where: { id: campaignId },
      data: { status: "sent", sentAt: new Date(), resultJson: result },
    });

    return result;
  }

  private async resolveAudience(audience: string, userIds: string[]) {
    const where: Prisma.UserWhereInput = {
      role: Role.PACIENTE,
      status: UserStatus.ATIVO,
    };

    if (audience === "one" || audience === "selected") {
      const ids = audience === "one" ? userIds.slice(0, 1) : userIds;
      if (!ids.length) throw new Error("Selecione pelo menos uma paciente.");
      where.id = { in: ids };
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true, accessExpiresAt: true, patientProfileData: true },
    });

    const active = users.filter((user) => !isPatientAccessExpired(user.accessExpiresAt));
    if (audience === "female" || audience === "male") {
      return active
        .filter((user) => profileGender(user.patientProfileData) === audience)
        .map((user) => user.id);
    }
    return active.map((user) => user.id);
  }
}
