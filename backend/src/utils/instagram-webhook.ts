import crypto from "crypto";
import { getInstagramAppSecret } from "./instagram-env";

/**
 * Valida o X-Hub-Signature-256 da Meta: HMAC-SHA256 do corpo CRU (Buffer)
 * usando o app secret. Exige a rota com express.raw() — se o corpo já tiver
 * passado pelo express.json(), a assinatura nunca bate.
 */
export function verifyInstagramWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined
): boolean {
  const secret = getInstagramAppSecret();
  if (!secret || !signatureHeader) return false;

  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const received = Buffer.from(signatureHeader);
  const computed = Buffer.from(expected);
  if (received.length !== computed.length) return false;
  return crypto.timingSafeEqual(received, computed);
}

/**
 * State assinado do OAuth: carrega o userId do nutri entre o início do fluxo
 * (rota autenticada) e o callback (rota pública), sem sessão no servidor.
 * Formato: base64url(userId:expiraEmMs):hmacHex
 */
export function createOauthState(userId: string, ttlMs = 15 * 60 * 1000): string | null {
  const secret = getInstagramAppSecret();
  if (!secret) return null;
  const payload = Buffer.from(`${userId}:${Date.now() + ttlMs}`).toString("base64url");
  const mac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

export function verifyOauthState(state: string | undefined): string | null {
  const secret = getInstagramAppSecret();
  if (!secret || !state) return null;

  const [payload, mac] = state.split(".");
  if (!payload || !mac) return null;

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const decoded = Buffer.from(payload, "base64url").toString("utf8");
  const idx = decoded.lastIndexOf(":");
  if (idx < 0) return null;
  const userId = decoded.slice(0, idx);
  const expiresAt = Number(decoded.slice(idx + 1));
  if (!userId || !Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  return userId;
}
