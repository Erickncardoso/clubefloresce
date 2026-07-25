import { prisma } from "../lib/prisma";
import { normalizePhoneForWhatsapp } from "../utils/phone";
import { normalizeWhatsappOutgoingText } from "../utils/whatsapp-message-format";
import { WhatsappService } from "./whatsapp.service";
import { EngagementZonesService } from "./engagement-zones.service";

const DELAY_MS = 20_000;

export const DEFAULT_DANGER_ZONE_WHATSAPP_MESSAGE = `Olá, *{{primeiroNome}}*!

Notei que você está um pouco distante do acompanhamento esta semana.

Que tal registrar sua refeição no *diário alimentar* ou atualizar a *hidratação* no app? Isso me ajuda a cuidar melhor de você.

Se precisar de apoio, é só responder esta mensagem. Estou por aqui.`;

type DangerSendJob = {
  nutriUserId: string;
  startedAt: number;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  currentName: string | null;
  done: boolean;
  cancelled: boolean;
};

const activeJobs = new Map<string, DangerSendJob>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderMessage(template: string, name: string): string {
  const firstName = String(name || "").split(" ")[0] || name || "paciente";
  return normalizeWhatsappOutgoingText(
    template
      .split("{{nome}}").join(name)
      .split("{{primeiroNome}}").join(firstName),
  );
}

export class DangerZoneWhatsappService {
  private readonly whatsappService = new WhatsappService();
  private readonly engagementZonesService = new EngagementZonesService();

  getJobStatus(nutriUserId: string) {
    return activeJobs.get(nutriUserId) || null;
  }

  async startBroadcast(nutriUserId: string, messageOverride?: string) {
    const existing = activeJobs.get(nutriUserId);
    if (existing && !existing.done) {
      return {
        started: false,
        alreadyRunning: true,
        job: existing,
      };
    }

    const zones = await this.engagementZonesService.getZonesForNutri();
    const dangerIds = (zones.zones.danger || []).map((p) => p.id);
    if (!dangerIds.length) {
      return { started: false, total: 0, skippedNoPhone: 0, message: "Nenhuma paciente na zona de perigo." };
    }

    const patients = await prisma.user.findMany({
      where: { id: { in: dangerIds }, role: "PACIENTE" },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    });

    const withPhone = patients
      .map((p) => ({
        id: p.id,
        name: p.name,
        phone: normalizePhoneForWhatsapp(p.phone),
      }))
      .filter((p) => Boolean(p.phone)) as Array<{ id: string; name: string; phone: string }>;

    const skippedNoPhone = patients.length - withPhone.length;
    if (!withPhone.length) {
      return {
        started: false,
        total: 0,
        skippedNoPhone,
        message: "Nenhuma paciente da zona de perigo tem telefone cadastrado.",
      };
    }

    const template = String(messageOverride || DEFAULT_DANGER_ZONE_WHATSAPP_MESSAGE).trim()
      || DEFAULT_DANGER_ZONE_WHATSAPP_MESSAGE;

    const job: DangerSendJob = {
      nutriUserId,
      startedAt: Date.now(),
      total: withPhone.length,
      sent: 0,
      failed: 0,
      skipped: skippedNoPhone,
      currentName: null,
      done: false,
      cancelled: false,
    };
    activeJobs.set(nutriUserId, job);

    void this.runJob(nutriUserId, withPhone, template).catch((error) => {
      console.error("[DangerZoneWhatsapp] job falhou:", error?.message || error);
      const current = activeJobs.get(nutriUserId);
      if (current) {
        current.done = true;
        current.currentName = null;
      }
    });

    return {
      started: true,
      total: withPhone.length,
      skippedNoPhone,
      delaySeconds: DELAY_MS / 1000,
      estimatedMinutes: Math.ceil((withPhone.length * DELAY_MS) / 60000),
      job,
    };
  }

  cancelBroadcast(nutriUserId: string) {
    const job = activeJobs.get(nutriUserId);
    if (!job || job.done) return { cancelled: false };
    job.cancelled = true;
    return { cancelled: true, job };
  }

  private async runJob(
    nutriUserId: string,
    patients: Array<{ id: string; name: string; phone: string }>,
    template: string,
  ) {
    const job = activeJobs.get(nutriUserId);
    if (!job) return;

    for (let i = 0; i < patients.length; i += 1) {
      if (job.cancelled) break;
      const patient = patients[i];
      job.currentName = patient.name;

      try {
        const text = renderMessage(template, patient.name);
        await this.whatsappService.sendText(nutriUserId, {
          number: patient.phone,
          text,
          delay: 1200,
        });
        job.sent += 1;
      } catch (error: any) {
        job.failed += 1;
        console.error(
          `[DangerZoneWhatsapp] falha ao enviar para ${patient.name}:`,
          error?.message || error,
        );
      }

      if (i < patients.length - 1 && !job.cancelled) {
        await sleep(DELAY_MS);
      }
    }

    job.done = true;
    job.currentName = null;
  }
}

export const dangerZoneWhatsappService = new DangerZoneWhatsappService();
