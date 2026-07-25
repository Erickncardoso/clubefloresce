import { readEnv } from "../utils/env";

export type WhatsappProvider = "uazapi" | "wuzapi";

const PROVIDER_ALIASES: Record<string, WhatsappProvider> = {
  uazapi: "uazapi",
  uaz: "uazapi",
  wuzapi: "wuzapi",
  wuz: "wuzapi",
};

export function getWhatsappProvider(): WhatsappProvider {
  const raw = String(readEnv("WHATSAPP_PROVIDER") || "wuzapi").trim().toLowerCase();
  return PROVIDER_ALIASES[raw] || "wuzapi";
}

export function isUazapiProvider(): boolean {
  return getWhatsappProvider() === "uazapi";
}

export function isWuzapiProvider(): boolean {
  return getWhatsappProvider() === "wuzapi";
}

export function getWhatsappProviderLabel(): string {
  return isUazapiProvider() ? "UAZAPI" : "WuzAPI";
}

export function assertUazapiConfigured(): void {
  if (!isUazapiProvider()) {
    throw new Error("UAZAPI desativada. Defina WHATSAPP_PROVIDER=uazapi para reativar.");
  }
  const url = String(readEnv("UAZAPI_SERVER_URL") || "").trim();
  if (!url) {
    throw new Error("UAZAPI_SERVER_URL não configurada.");
  }
}

export function assertWuzapiConfigured(): void {
  if (!isWuzapiProvider()) {
    throw new Error("WuzAPI desativada. Defina WHATSAPP_PROVIDER=wuzapi.");
  }
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
  const auth = String(authUserId || "").trim();
  if (!isWuzapiProvider()) return auth;
  const mapped = String(readEnv("WUZAPI_DEFAULT_USER_ID") || "").trim();
  return mapped || auth;
}
