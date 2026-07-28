import { wuzapiForUser } from "./wuzapi-api";
import { wuzapiHttp } from "./wuzapi-http.client";
import {
  isPlausibleWhatsappPhoneDigits,
  normalizeContactsRecord,
  normalizeLookupJid,
  normalizePhone,
  toChatJid,
} from "./wuzapi-mappers";

type JsonObject = Record<string, unknown>;

type LidMapping = {
  lid: string;
  pn: string;
  updatedAt: number;
};

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const pickText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  return "";
};

const parseUserLidPayload = (body: unknown): { lid: string; pn: string } => {
  const unwrapped = wuzapiHttp.unwrap(body) as JsonObject;
  const row = (unwrapped?.jid || unwrapped?.JID || unwrapped?.lid || unwrapped?.LID)
    ? unwrapped
    : (unwrapped?.data && typeof unwrapped.data === "object" ? unwrapped.data as JsonObject : unwrapped);

  const lid = pickText(row?.lid || row?.LID).toLowerCase();
  const pn = pickText(row?.jid || row?.JID).toLowerCase();
  return { lid, pn };
};

/** Resolve @lid ↔ @s.whatsapp.net via webhooks, /user/contacts e GET /user/lid/{phone}. */
export class WuzapiLidResolverService {
  private cache = new Map<string, LidMapping>();

  private cacheKey(userId: string, lidJid: string): string {
    return `${userId}:${normalizeLookupJid(lidJid)}`;
  }

  registerMapping(userId: string, lidJid: string, pnJid: string): void {
    const lid = normalizeLookupJid(lidJid);
    const pn = normalizeLookupJid(pnJid);
    if (!lid.endsWith("@lid") || !pn.endsWith("@s.whatsapp.net")) return;
    if (!isPlausibleWhatsappPhoneDigits(normalizePhone(pn))) return;
    this.cache.set(this.cacheKey(userId, lid), { lid, pn, updatedAt: Date.now() });
  }

  extractPnJidFromRaw(raw: unknown): string | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const row = raw as JsonObject;

    const directCandidates = [
      row.sender_pn,
      row.senderPn,
      row.SenderPn,
      row.recipient,
      row.to,
    ];
    for (const candidate of directCandidates) {
      const value = pickText(candidate).toLowerCase();
      if (value.endsWith("@s.whatsapp.net") && isPlausibleWhatsappPhoneDigits(normalizePhone(value))) {
        return value;
      }
    }

    const info = (row.Info ?? row.info) as JsonObject | undefined;
    if (info && typeof info === "object") {
      const infoCandidates = [
        info.SenderAlt,
        info.senderAlt,
        info.Sender,
        info.sender,
        info.Participant,
        info.participant,
        info.RemoteJid,
        info.remoteJid,
        info.Chat,
        info.chat,
      ];
      for (const candidate of infoCandidates) {
        const value = pickText(candidate).toLowerCase();
        if (value.endsWith("@s.whatsapp.net") && isPlausibleWhatsappPhoneDigits(normalizePhone(value))) {
          return value;
        }
      }
    }

    const key = (row.key ?? row.Key) as JsonObject | undefined;
    if (key && typeof key === "object") {
      const keyCandidates = [key.participant, key.Participant, key.remoteJid, key.RemoteJid];
      for (const candidate of keyCandidates) {
        const value = pickText(candidate).toLowerCase();
        if (value.endsWith("@s.whatsapp.net") && isPlausibleWhatsappPhoneDigits(normalizePhone(value))) {
          return value;
        }
      }
    }

    const message = (row.Message ?? row.message) as JsonObject | undefined;
    if (message && typeof message === "object") {
      const nested = this.extractPnJidFromRaw(message);
      if (nested) return nested;
    }

    return null;
  }

  registerFromMessageRaw(userId: string, chatJid: string, raw: unknown): void {
    const pn = this.extractPnJidFromRaw(raw);
    if (!pn) return;
    const lid = normalizeLookupJid(chatJid);
    if (lid.endsWith("@lid")) {
      this.registerMapping(userId, lid, pn);
      return;
    }
    const waChatLid = pickText(
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as JsonObject).wa_chatlid
          || (raw as JsonObject).chatlid
          || (raw as JsonObject).chatLid
        : "",
    ).toLowerCase();
    if (waChatLid.endsWith("@lid")) {
      this.registerMapping(userId, waChatLid, pn);
    }
  }

  getPnJid(userId: string, lidJid: string): string | null {
    const hit = this.cache.get(this.cacheKey(userId, lidJid));
    if (!hit) return null;
    if (Date.now() - hit.updatedAt > CACHE_TTL_MS) {
      this.cache.delete(this.cacheKey(userId, lidJid));
      return null;
    }
    return hit.pn;
  }

  resolveCanonicalChatJid(userId: string, chatJid: string, raw?: unknown): string {
    const jid = normalizeLookupJid(chatJid);
    if (!jid) return "";
    if (jid.endsWith("@g.us")) return jid;
    if (jid.endsWith("@s.whatsapp.net")) {
      if (isPlausibleWhatsappPhoneDigits(normalizePhone(jid))) return jid;
      return jid;
    }
    if (raw) this.registerFromMessageRaw(userId, jid, raw);
    if (jid.endsWith("@lid")) {
      const pn = this.getPnJid(userId, jid);
      if (pn) return pn;
    }
    return jid;
  }

  /** Swagger: GET /user/lid/{phone} — telefone internacional sem +. */
  async prefetchFromPhone(userId: string, phone: string): Promise<void> {
    const digits = normalizePhone(phone);
    if (!isPlausibleWhatsappPhoneDigits(digits)) return;
    try {
      const body = await wuzapiForUser(userId).userLid(digits);
      const { lid, pn } = parseUserLidPayload(body);
      const resolvedPn = pn.endsWith("@s.whatsapp.net")
        ? pn
        : toChatJid(digits).toLowerCase();
      if (lid.endsWith("@lid") && resolvedPn.endsWith("@s.whatsapp.net")) {
        this.registerMapping(userId, lid, resolvedPn);
      }
    } catch {
      /* contato pode não existir no WhatsApp */
    }
  }

  /** Busca @lid → telefone na agenda (/user/contacts) pelo campo LID do contato. */
  async prefetchFromContactsForLid(userId: string, lidJid: string): Promise<void> {
    const targetLid = normalizeLookupJid(lidJid);
    if (!targetLid.endsWith("@lid")) return;
    if (this.getPnJid(userId, targetLid)) return;

    try {
      const body = await wuzapiForUser(userId).userContacts();
      const contacts = normalizeContactsRecord(wuzapiHttp.unwrap(body) ?? body);
      for (const [key, value] of Object.entries(contacts)) {
        if (!value || typeof value !== "object") continue;
        const row = value as JsonObject;
        const rowLid = normalizeLookupJid(
          pickText(row.LID || row.lid || (key.endsWith("@lid") ? key : "")),
        );
        if (rowLid !== targetLid) continue;

        const pnFromRow = pickText(row.JID || row.jid || row.Phone || row.phone || key).toLowerCase();
        if (pnFromRow.endsWith("@s.whatsapp.net") && isPlausibleWhatsappPhoneDigits(normalizePhone(pnFromRow))) {
          this.registerMapping(userId, targetLid, pnFromRow);
          return;
        }

        const phoneDigits = normalizePhone(pnFromRow || key);
        if (!isPlausibleWhatsappPhoneDigits(phoneDigits)) continue;
        await this.prefetchFromPhone(userId, phoneDigits);
        if (this.getPnJid(userId, targetLid)) return;
      }
    } catch {
      /* ignore */
    }
  }

  /** Resolve telefone a partir de @lid (cache → contatos → GET /user/lid/{phone}). */
  async resolvePhoneFromLid(userId: string, lidJid: string): Promise<string> {
    const lid = normalizeLookupJid(lidJid);
    if (!lid.endsWith("@lid")) return "";
    const cached = this.getPnJid(userId, lid);
    if (cached) return normalizePhone(cached);
    await this.prefetchFromContactsForLid(userId, lid);
    const pn = this.getPnJid(userId, lid);
    return pn ? normalizePhone(pn) : "";
  }

  async resolvePhoneForSend(userId: string, target: string): Promise<string> {
    const raw = String(target || "").trim();
    if (!raw) return "";
    const jid = raw.includes("@") ? normalizeLookupJid(raw) : toChatJid(normalizePhone(raw));

    if (jid.endsWith("@s.whatsapp.net") && isPlausibleWhatsappPhoneDigits(normalizePhone(jid))) {
      return normalizePhone(jid);
    }

    if (jid.endsWith("@lid")) {
      const phone = await this.resolvePhoneFromLid(userId, jid);
      if (phone) return phone;
    }

    const digits = normalizePhone(raw);
    if (isPlausibleWhatsappPhoneDigits(digits)) {
      await this.prefetchFromPhone(userId, digits);
      return digits;
    }

    return digits;
  }

  /** Indexa mapeamentos lid↔jid a partir da agenda + GET /user/lid/{phone}. */
  async warmFromContacts(userId: string, max = 40): Promise<void> {
    try {
      const body = await wuzapiForUser(userId).userContacts();
      const contacts = normalizeContactsRecord(wuzapiHttp.unwrap(body) ?? body);
      let count = 0;

      for (const [key, value] of Object.entries(contacts)) {
        if (count >= max) break;
        if (!value || typeof value !== "object") continue;
        const row = value as JsonObject;

        const rowLid = normalizeLookupJid(pickText(row.LID || row.lid));
        const rowPn = pickText(row.JID || row.jid || row.Phone || row.phone || key).toLowerCase();
        if (rowLid.endsWith("@lid") && rowPn.endsWith("@s.whatsapp.net")) {
          this.registerMapping(userId, rowLid, rowPn);
        }

        const phoneDigits = normalizePhone(rowPn || key);
        if (!isPlausibleWhatsappPhoneDigits(phoneDigits)) continue;
        await this.prefetchFromPhone(userId, phoneDigits);
        count += 1;
      }
    } catch {
      /* ignore */
    }
  }

  /** Pré-aquece mapeamentos para targets @lid da sidebar (avatars, detalhes). */
  async warmFromLidTargets(userId: string, targets: string[], max = 25): Promise<void> {
    const lids = Array.from(new Set(
      (Array.isArray(targets) ? targets : [])
        .map((item) => normalizeLookupJid(String(item || "")))
        .filter((item) => item.endsWith("@lid")),
    )).slice(0, max);

    if (!lids.length) return;

    await this.warmFromContacts(userId, Math.max(20, max));

    await Promise.allSettled(
      lids.map((lid) => this.prefetchFromContactsForLid(userId, lid)),
    );
  }
}

const wuzapiLidResolverService = new WuzapiLidResolverService();
export default wuzapiLidResolverService;
