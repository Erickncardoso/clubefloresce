/**
 * Fachada WhatsApp — WuzAPI é o único provider suportado.
 * Implementação em `wuzapi.service.ts` / `wuzapi/wuzapi-whatsapp.service.ts`.
 */
import { WuzapiWhatsappService } from "./wuzapi.service";

export type WhatsappService = WuzapiWhatsappService;
export const WhatsappService = WuzapiWhatsappService;

export function getActiveWhatsappProvider(): "wuzapi" {
  return "wuzapi";
}
