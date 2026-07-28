import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { randomBytes } from "crypto";
import { prisma } from "../lib/prisma";
import { assertPatientUser } from "../utils/patient-access";
import { getPatientAppOpenUrl, getPatientAppProductionUrl } from "../utils/email-config";
import { normalizePhoneForWhatsapp } from "../utils/phone";
import { NotificationRepository } from "../repositories/notification.repository";
import { WhatsappService } from "./whatsapp.service";

export type VideoCallRecord = {
  id: string;
  roomName: string;
  roomUrl: string;
  patientId: string;
  nutriId: string;
  patientName: string;
  nutriName: string;
  status: "ringing" | "active" | "ended";
  createdAt: number;
  expiresAt: number;
};

const CALL_TTL_MS = 60 * 60 * 1000;
const STORE_PATH = join(process.cwd(), ".data", "video-calls.json");
const DEFAULT_JITSI_BASE = "https://meet.nutrisabellajardim.com.br";

const notificationRepo = new NotificationRepository();
const whatsappService = new WhatsappService();

function getJitsiBaseUrl(): string {
  const raw = (
    process.env.JITSI_BASE_URL
    || process.env.JITSI_PUBLIC_URL
    || DEFAULT_JITSI_BASE
  ).trim();
  return raw.replace(/\/+$/, "") || DEFAULT_JITSI_BASE;
}

function ensureStoreDir() {
  const dir = dirname(STORE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadStore(): Map<string, VideoCallRecord> {
  try {
    if (!existsSync(STORE_PATH)) return new Map();
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8"));
    const map = new Map<string, VideoCallRecord>();
    if (raw && typeof raw === "object") {
      for (const [id, value] of Object.entries(raw)) {
        map.set(id, value as VideoCallRecord);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

function saveStore(map: Map<string, VideoCallRecord>) {
  try {
    ensureStoreDir();
    const obj: Record<string, VideoCallRecord> = {};
    for (const [id, call] of map) obj[id] = call;
    writeFileSync(STORE_PATH, JSON.stringify(obj), "utf8");
  } catch (error: any) {
    console.error("[video-call] failed to persist store:", error?.message || error);
  }
}

let activeCalls = loadStore();

function purgeExpired() {
  const now = Date.now();
  let changed = false;
  for (const [id, call] of activeCalls) {
    if (call.expiresAt <= now || call.status === "ended") {
      activeCalls.delete(id);
      changed = true;
    }
  }
  if (changed) saveStore(activeCalls);
}

function buildRoomName(patientId: string) {
  const short = patientId.replace(/-/g, "").slice(0, 8);
  const nonce = randomBytes(4).toString("hex");
  return `cf-${short}-${nonce}`.toLowerCase();
}

function buildRoomUrl(roomName: string) {
  return `${getJitsiBaseUrl()}/${encodeURIComponent(roomName)}`;
}

function buildJoinPath(call: VideoCallRecord) {
  return `/chamada?callId=${encodeURIComponent(call.id)}&room=${encodeURIComponent(call.roomName)}`;
}

function toPublic(
  call: VideoCallRecord,
  viewerRole: "NUTRICIONISTA" | "PACIENTE",
) {
  const displayName = viewerRole === "NUTRICIONISTA" ? call.nutriName : call.patientName;
  const joinPath = buildJoinPath(call);
  const jitsiDomain = getJitsiBaseUrl().replace(/^https?:\/\//, "");

  return {
    id: call.id,
    roomName: call.roomName,
    roomUrl: call.roomUrl,
    status: call.status,
    patientId: call.patientId,
    patientName: call.patientName,
    nutriName: call.nutriName,
    provider: "jitsi" as const,
    displayName,
    token: null,
    jitsiDomain,
    embedUrl: call.roomUrl,
    joinPath,
    joinUrl: `${getPatientAppProductionUrl()}${joinPath}`,
    openAppUrl: getPatientAppOpenUrl("video-call", joinPath),
    createdAt: new Date(call.createdAt).toISOString(),
    expiresAt: new Date(call.expiresAt).toISOString(),
  };
}

export class VideoCallService {
  async startCall(nutriId: string, patientId: string, options?: { notifyWhatsapp?: boolean }) {
    purgeExpired();
    await assertPatientUser(patientId);
    getJitsiBaseUrl();

    const [patient, nutri] = await Promise.all([
      prisma.user.findUnique({
        where: { id: patientId },
        select: { id: true, name: true, phone: true, role: true },
      }),
      prisma.user.findUnique({
        where: { id: nutriId },
        select: { id: true, name: true },
      }),
    ]);

    if (!patient || patient.role !== "PACIENTE") {
      throw new Error("Paciente não encontrado.");
    }
    if (!nutri) {
      throw new Error("Nutricionista não encontrada.");
    }

    for (const [id, existing] of activeCalls) {
      if (
        existing.patientId === patientId
        && existing.status !== "ended"
        && existing.expiresAt > Date.now()
      ) {
        activeCalls.delete(id);
      }
    }

    const now = Date.now();
    const roomName = buildRoomName(patientId);
    const roomUrl = buildRoomUrl(roomName);

    const call: VideoCallRecord = {
      id: randomBytes(16).toString("hex"),
      roomName,
      roomUrl,
      patientId,
      nutriId,
      patientName: patient.name || "Paciente",
      nutriName: nutri.name || "Nutricionista",
      status: "ringing",
      createdAt: now,
      expiresAt: now + CALL_TTL_MS,
    };
    activeCalls.set(call.id, call);
    saveStore(activeCalls);
    console.log(`[video-call] jitsi room=${call.roomName} call=${call.id} patient=${patientId}`);

    const publicCall = toPublic(call, "NUTRICIONISTA");
    // Temporário: WhatsApp de chamada desligado até o fluxo de vídeo estabilizar
    const notifyWhatsapp = options?.notifyWhatsapp === true;

    void this.notifyPatient(call, publicCall, {
      phone: patient.phone,
      nutriId,
      notifyWhatsapp,
    }).catch((error: any) => {
      console.error("[video-call] notify failed:", error?.message || error);
    });

    return {
      call: publicCall,
      notified: {
        push: true,
        whatsapp: notifyWhatsapp,
        whatsappError: null,
      },
    };
  }

  private async notifyPatient(
    call: VideoCallRecord,
    publicCall: ReturnType<typeof toPublic>,
    opts: { phone?: string | null; nutriId: string; notifyWhatsapp: boolean },
  ) {
    try {
      // Sempre cria notificação + Web Push (sourceKey único por call).
      await notificationRepo.upsertBySourceKey({
        userId: call.patientId,
        type: "video_call",
        title: "Chamada de vídeo",
        body: `${call.nutriName} está te ligando. Toque para atender.`,
        actionPath: publicCall.joinPath,
        sourceKey: `video-call:${call.id}`,
      });
      console.log(`[video-call] push queued for patient=${call.patientId} call=${call.id}`);
    } catch (error: any) {
      console.error("[video-call] push/notification failed:", error?.message || error);
    }

    if (!opts.notifyWhatsapp) return;

    const number = normalizePhoneForWhatsapp(opts.phone);
    if (!number) {
      console.warn("[video-call] paciente sem telefone válido para WhatsApp");
      return;
    }

    try {
      await whatsappService.sendText(opts.nutriId, {
        number,
        text: [
          `Olá, ${call.patientName.split(" ")[0] || "tudo bem"}!`,
          "",
          `${call.nutriName} está te chamando para a consulta por vídeo.`,
          "",
          `Toque para atender: ${publicCall.openAppUrl}`,
        ].join("\n"),
        linkPreview: true,
        linkPreviewTitle: "Chamada de vídeo — Clube Florescer",
        linkPreviewDescription: "Toque para entrar na consulta com sua nutricionista.",
        linkPreviewLarge: true,
        delay: 600,
      });
    } catch (error: any) {
      console.error("[video-call] WhatsApp notify failed:", error?.message || error);
    }
  }

  async getCallForNutri(callId: string, nutriId: string) {
    activeCalls = loadStore();
    purgeExpired();
    const call = activeCalls.get(callId);
    if (!call || call.status === "ended" || call.expiresAt <= Date.now()) {
      throw new Error("Chamada não encontrada ou encerrada.");
    }
    if (call.nutriId !== nutriId) {
      throw new Error("Você não tem acesso a esta chamada.");
    }
    return toPublic(call, "NUTRICIONISTA");
  }

  async getCallForPatient(callId: string, patientId: string) {
    activeCalls = loadStore();
    purgeExpired();
    const call = activeCalls.get(callId);
    if (!call || call.status === "ended" || call.expiresAt <= Date.now()) {
      throw new Error("Chamada não encontrada ou encerrada.");
    }
    if (call.patientId !== patientId) {
      throw new Error("Você não tem acesso a esta chamada.");
    }
    if (call.status === "ringing") {
      call.status = "active";
      activeCalls.set(call.id, call);
      saveStore(activeCalls);
    }
    return toPublic(call, "PACIENTE");
  }

  getActiveForPatient(patientId: string) {
    activeCalls = loadStore();
    purgeExpired();
    for (const call of activeCalls.values()) {
      if (
        call.patientId === patientId
        && call.status === "ringing"
        && call.expiresAt > Date.now()
      ) {
        return toPublic(call, "PACIENTE");
      }
    }
    return null;
  }

  endAllForPatient(patientId: string, nutriId: string) {
    activeCalls = loadStore();
    purgeExpired();
    let ended = 0;
    for (const [id, call] of [...activeCalls.entries()]) {
      if (call.patientId !== patientId) continue;
      if (call.nutriId !== nutriId) continue;
      if (call.status === "ended") continue;
      activeCalls.delete(id);
      ended += 1;
      void notificationRepo.deleteBySourceKey(patientId, `video-call:${id}`).catch(() => {});
    }
    if (ended) saveStore(activeCalls);
    console.log(`[video-call] ended ${ended} call(s) for patient=${patientId}`);
    return { ended: true, count: ended };
  }

  endCall(callId: string, userId: string, role: "NUTRICIONISTA" | "PACIENTE") {
    activeCalls = loadStore();
    purgeExpired();
    const call = activeCalls.get(callId);
    if (!call) {
      return { ended: true };
    }
    const allowed =
      (role === "NUTRICIONISTA" && call.nutriId === userId)
      || (role === "PACIENTE" && call.patientId === userId);
    if (!allowed) {
      throw new Error("Você não tem acesso a esta chamada.");
    }

    if (role === "NUTRICIONISTA") {
      return this.endAllForPatient(call.patientId, userId);
    }

    // Paciente só sai — não apaga a sala da nutri
    call.status = "active";
    activeCalls.set(call.id, call);
    saveStore(activeCalls);
    return { ended: false, left: true };
  }
}

export const videoCallService = new VideoCallService();
