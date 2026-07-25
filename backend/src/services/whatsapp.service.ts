/**
 * Fachada WhatsApp — delega para WuzAPI (padrão) ou UAZAPI (legado).
 *
 * UAZAPI: ver `uazapi.service.ts` (código original preservado).
 * WuzAPI: ver `wuzapi.service.ts` (migração em andamento).
 *
 * Controle: WHATSAPP_PROVIDER=wuzapi|uazapi (default: wuzapi)
 */
import { isUazapiProvider, isWuzapiProvider } from "../config/whatsapp-provider.config";
import { UazapiWhatsappService } from "./uazapi.service";
import { WuzapiWhatsappService } from "./wuzapi.service";

const uazapiSingleton = new UazapiWhatsappService();
const wuzapiSingleton = new WuzapiWhatsappService();

function activeImpl(): UazapiWhatsappService | WuzapiWhatsappService {
  return isUazapiProvider() ? uazapiSingleton : wuzapiSingleton;
}

function pendingMethod(method: string): never {
  throw new Error(`[WuzAPI] ${method} ainda não implementado. Migração em andamento.`);
}

/** Superfície de API = UAZAPI (legado completo); runtime delega para WuzAPI quando configurado. */
export type WhatsappService = UazapiWhatsappService;

class WhatsappServiceFacade {
  constructor() {
    return new Proxy(this, {
      get(_target, prop: string | symbol) {
        if (prop === "constructor") return WhatsappServiceFacade;
        const impl = activeImpl() as unknown as Record<string | symbol, unknown>;
        const value = impl[prop];
        if (typeof value === "function") {
          return (...args: unknown[]) => (value as (...a: unknown[]) => unknown).apply(impl, args);
        }
        if (value !== undefined) return value;
        if (typeof prop === "string" && isWuzapiProvider() && !prop.startsWith("_")) {
          return (..._args: unknown[]) => pendingMethod(prop);
        }
        return value;
      },
    }) as this;
  }
}

export const WhatsappService = WhatsappServiceFacade as new () => WhatsappService;

export function getActiveWhatsappProvider(): "uazapi" | "wuzapi" {
  return isUazapiProvider() ? "uazapi" : "wuzapi";
}
