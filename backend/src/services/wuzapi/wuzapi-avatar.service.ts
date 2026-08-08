/**
 * Resolve avatares WuzAPI (POST /user/avatar) para URLs exibíveis no browser.
 * CDN do WhatsApp costuma bloquear hotlink no <img> — convertemos para data URL quando necessário.
 */
import { wuzapiHttp } from "./wuzapi-http.client";
import wuzapiLidResolverService from "./wuzapi-lid-resolver.service";
import {
  dataUriFromBase64,
  isGroupJid,
  isPlausibleWhatsappPhoneDigits,
  normalizeLookupJid,
  normalizePhone,
  pickAvatarUrl,
  pickGroupAvatarUrl,
  toGroupJid,
} from "./wuzapi-mappers";

type CacheEntry = { at: number; value: string };

const CACHE_TTL_MS = 15 * 60 * 1000;
const cacheByKey = new Map<string, CacheEntry>();

const cacheKey = (userId: string, target: string, preview: boolean) =>
  `${userId}:${String(target || "").trim().toLowerCase()}:${preview ? "p" : "f"}`;

const readCached = (key: string): string => {
  const hit = cacheByKey.get(key);
  if (!hit) return "";
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cacheByKey.delete(key);
    return "";
  }
  return hit.value;
};

const writeCached = (key: string, value: string) => {
  if (!value) return;
  cacheByKey.set(key, { at: Date.now(), value });
};

const unwrap = (body: unknown): Record<string, unknown> => {
  const row = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const data = row.data ?? row.Data;
  if (data && typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
  return row;
};

const isHttpUrl = (value: string) => /^https?:\/\//i.test(String(value || "").trim());

const fetchRemoteImageAsDataUrl = async (url: string): Promise<string> => {
  const target = String(url || "").trim();
  if (!isHttpUrl(target)) return "";
  try {
    const res = await fetch(target, {
      headers: { Accept: "image/*,*/*", "User-Agent": "Mozilla/5.0 (compatible; ClubeFlorescer/1.0)" },
      redirect: "follow",
    });
    if (!res.ok) return target;
    const mime = String(res.headers.get("content-type") || "image/jpeg").split(";")[0].trim() || "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) return target;
    const base64 = buf.toString("base64");
    return dataUriFromBase64(mime, base64);
  } catch {
    return target;
  }
};

const normalizeAvatarForBrowser = async (raw: string): Promise<string> => {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (value.startsWith("data:image/")) return value;
  if (isHttpUrl(value)) return fetchRemoteImageAsDataUrl(value);
  return value;
};

const resolvePrivateAvatarPhone = async (
  userId: string,
  target: string,
  excludePhones: string[] = [],
): Promise<string> => {
  const raw = String(target || "").trim();
  if (!raw) return "";
  const excluded = new Set(
    (Array.isArray(excludePhones) ? excludePhones : [])
      .map((p) => normalizePhone(p))
      .filter((p) => isPlausibleWhatsappPhoneDigits(p)),
  );
  const digitsOnly = normalizePhone(raw);
  if (isPlausibleWhatsappPhoneDigits(digitsOnly) && !raw.includes("@")) {
    return excluded.has(digitsOnly) ? "" : digitsOnly;
  }
  if (normalizeLookupJid(raw).endsWith("@lid")) {
    const fromLid = await wuzapiLidResolverService.resolvePhoneFromLid(
      userId,
      raw,
      "",
      excludePhones,
    );
    if (fromLid && !excluded.has(fromLid)) return fromLid;
  }

  const resolved = await wuzapiLidResolverService.resolvePhoneForSend(
    userId,
    raw,
    "",
    excludePhones,
  );
  if (isPlausibleWhatsappPhoneDigits(resolved) && !excluded.has(resolved)) return resolved;
  return "";
};

export async function fetchWuzapiUserAvatar(
  userId: string,
  phoneOrJid: string,
  preview = true,
  excludePhones: string[] = [],
): Promise<string> {
  const target = String(phoneOrJid || "").trim();
  if (!target) return "";

  const key = cacheKey(userId, target, preview);
  const cached = readCached(key);
  if (cached) return cached;

  try {
    if (isGroupJid(target)) {
      const groupJid = toGroupJid(target);
      const infoBody = await wuzapiHttp.getUser(userId, "/group/info", { groupJID: groupJid });
      const row = unwrap(infoBody);
      const image = pickGroupAvatarUrl(row);
      const resolved = await normalizeAvatarForBrowser(image);
      writeCached(key, resolved);
      return resolved;
    }

    const phone = await resolvePrivateAvatarPhone(userId, target, excludePhones);
    const tryPhones: string[] = [];
    if (phone) tryPhones.push(phone);

    // Fallback: WuzAPI às vezes aceita o user do @lid quando não há PN (agenda só tem sessão)
    const lid = normalizeLookupJid(target);
    if (lid.endsWith("@lid")) {
      const lidUser = lid.split("@")[0] || "";
      if (lidUser && !tryPhones.includes(lidUser)) tryPhones.push(lidUser);
      if (!tryPhones.includes(lid)) tryPhones.push(lid);
    }

    for (const candidate of tryPhones) {
      const phoneCacheKey = cacheKey(userId, candidate, preview);
      const cachedByPhone = readCached(phoneCacheKey);
      if (cachedByPhone) {
        writeCached(key, cachedByPhone);
        return cachedByPhone;
      }

      try {
        const avatarBody = await wuzapiHttp.postUser(userId, "/user/avatar", {
          Phone: candidate,
          Preview: preview,
        });
        const picked = pickAvatarUrl(unwrap(avatarBody) ?? avatarBody);
        const resolved = await normalizeAvatarForBrowser(picked);
        if (!resolved) continue;
        writeCached(phoneCacheKey, resolved);
        writeCached(key, resolved);
        return resolved;
      } catch {
        /* tenta próximo candidato */
      }
    }
    return "";
  } catch {
    return "";
  }
}

export function clearWuzapiAvatarCacheForUser(userId: string): void {
  const prefix = `${userId}:`;
  for (const key of cacheByKey.keys()) {
    if (key.startsWith(prefix)) cacheByKey.delete(key);
  }
}
