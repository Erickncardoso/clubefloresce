import { prisma } from "../lib/prisma";

/** Normaliza JID da conta (ignora sufixo de dispositivo .0:52). */
export function normalizeWhatsappSessionJid(jid: unknown): string {
  const raw = String(jid || "").trim().toLowerCase();
  if (!raw || !raw.includes("@")) return raw;
  const [userPart, server] = raw.split("@");
  const baseUser = String(userPart || "").split(":")[0]?.split(".")[0] || userPart;
  return `${baseUser}@${server || "s.whatsapp.net"}`;
}

export function extractSessionJidFromStatusPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const body = payload as Record<string, unknown>;
  const status = body.status && typeof body.status === "object" ? body.status as Record<string, unknown> : {};
  const instance = body.instance && typeof body.instance === "object" ? body.instance as Record<string, unknown> : {};

  const candidates = [
    body.jid,
    body.JID,
    body.id,
    body.ID,
    body.phone,
    body.Phone,
    status.jid,
    status.JID,
    status.id,
    status.ID,
    instance.jid,
    instance.JID,
    instance.id,
    instance.ID,
    (body.event as Record<string, unknown> | undefined)?.jid,
    (body.event as Record<string, unknown> | undefined)?.JID,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeWhatsappSessionJid(candidate);
    if (normalized) return normalized;
  }
  return "";
}

export class WhatsappSessionService {
  async getBoundSessionJid(userId: string): Promise<string | null> {
    const row = await prisma.whatsappSessionBinding.findUnique({ where: { userId } });
    const jid = normalizeWhatsappSessionJid(row?.sessionJid);
    return jid || null;
  }

  async bindSessionJid(userId: string, sessionJid: string): Promise<void> {
    const normalized = normalizeWhatsappSessionJid(sessionJid);
    if (!normalized) return;
    await prisma.whatsappSessionBinding.upsert({
      where: { userId },
      update: { sessionJid: normalized },
      create: { userId, sessionJid: normalized },
    });
  }

  async clearSessionBinding(userId: string): Promise<void> {
    await prisma.whatsappSessionBinding.deleteMany({ where: { userId } });
  }

  /**
   * Se o JID da conta mudou, purga chats/mensagens/mídia locais antes de continuar.
   * Retorna true quando houve purge (troca de conta WhatsApp).
   */
  async ensureSessionIsolation(
    userId: string,
    nextSessionJid: string,
    purge: () => Promise<void>,
  ): Promise<{ purged: boolean; previousJid: string | null; nextJid: string }> {
    const nextJid = normalizeWhatsappSessionJid(nextSessionJid);
    if (!nextJid) return { purged: false, previousJid: null, nextJid: "" };

    const previousJid = await this.getBoundSessionJid(userId);
    if (previousJid && previousJid !== nextJid) {
      await purge();
      await this.clearSessionBinding(userId);
      await this.bindSessionJid(userId, nextJid);
      console.warn(
        `[WhatsApp Session] Conta trocada (${previousJid} → ${nextJid}) — dados locais purgados para ${userId.slice(0, 8)}…`,
      );
      return { purged: true, previousJid, nextJid };
    }

    if (!previousJid) {
      await this.bindSessionJid(userId, nextJid);
    }

    return { purged: false, previousJid, nextJid };
  }

  /** Antes de novo QR / pareamento — remove cache de sessão anterior desconectada. */
  async purgeStalePairingData(userId: string, purge: () => Promise<void>): Promise<void> {
    await purge();
    await this.clearSessionBinding(userId);
    console.log(`[WhatsApp Session] Cache local purgado antes de novo pareamento (${userId.slice(0, 8)}…)`);
  }
}

const whatsappSessionService = new WhatsappSessionService();
export default whatsappSessionService;
