import { readEnv } from "../utils/env";

/** WuzAPI é o único provider suportado — UAZAPI foi removida do código. */
export type WhatsappProvider = "wuzapi";

export function getWhatsappProvider(): WhatsappProvider {
  return "wuzapi";
}

export function isWuzapiProvider(): boolean {
  return true;
}

export function getWhatsappProviderLabel(): string {
  return "WuzAPI";
}

export function assertWuzapiConfigured(): void {
  const url = String(readEnv("WUZAPI_SERVER_URL") || "").trim();
  if (!url) {
    throw new Error("WUZAPI_SERVER_URL não configurada.");
  }
}

export function getWuzapiBaseUrl(): string {
  return String(readEnv("WUZAPI_SERVER_URL") || "").replace(/\/+$/, "");
}

export function getWuzapiUserToken(_userId?: string): string {
  return String(readEnv("WUZAPI_USER_TOKEN") || "").trim();
}

/** Mapeia token WuzAPI → userId do Florescer (single-tenant por enquanto). */
export function resolveFlorescerUserIdFromWuzapiToken(token: string): string | null {
  const expected = getWuzapiUserToken();
  const mapped = String(readEnv("WUZAPI_DEFAULT_USER_ID") || "").trim();
  if (!expected || !mapped) return null;
  if (String(token || "").trim() !== expected) return null;
  return mapped;
}

/** userId canônico para chats/mensagens no DB (WuzAPI = tenant único). */
export function resolveWhatsappDatastoreUserId(authUserId: string): string {
  const mapped = String(readEnv("WUZAPI_DEFAULT_USER_ID") || "").trim();
  return mapped || String(authUserId || "").trim();
}
