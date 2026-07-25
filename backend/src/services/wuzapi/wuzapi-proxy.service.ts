/**
 * Proxy UAZAPI → WuzAPI para o frontend admin continuar usando /api/whatsapp/proxy/*.
 */
import { WhatsappService } from "../whatsapp.service";
import { mapMarkReadBody, normalizePhone, normalizeProxyResponse, unsupportedUazFeature } from "./wuzapi-mappers";
import { wuzapiHttp } from "./wuzapi-http.client";

const whatsappService = new WhatsappService();

type ProxyHandler = (userId: string, body: Record<string, unknown>, query: Record<string, string>) => Promise<any>;

const UNSUPPORTED = new Set([
  "/chat/archive",
  "/chat/delete",
  "/chat/mute",
  "/chat/labels",
  "/label/edit",
  "/labels/refresh",
  "/contact/add",
  "/business/get/profile",
  "/business/get/categories",
  "/business/catalog/list",
  "/business/catalog/info",
  "/business/catalog/show",
]);

export class WuzapiProxyService {
  async handle(userId: string, endpoint: string, method: string, body: Record<string, unknown>, query: Record<string, string>): Promise<any> {
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const upper = method.toUpperCase();

    if (UNSUPPORTED.has(path)) {
      return unsupportedUazFeature(path);
    }

    if (upper === "GET") {
      return this.handleGet(userId, path, query);
    }

    const handler = POST_ROUTES[path];
    if (!handler) {
      throw new Error(`[WuzAPI Proxy] Endpoint não mapeado: ${path}`);
    }
    const result = await handler(userId, body || {}, query);
    return normalizeProxyResponse(result);
  }

  private async handleGet(userId: string, path: string, query: Record<string, string>): Promise<any> {
    if (path === "/contacts") {
      return whatsappService.getContacts(userId, query.contactScope);
    }
    if (path === "/labels") {
      return whatsappService.getLabels(userId);
    }
    throw new Error(`[WuzAPI Proxy] GET não mapeado: ${path}`);
  }
}

const POST_ROUTES: Record<string, ProxyHandler> = {
  "/send/text": async (userId, body) => whatsappService.sendText(userId, body),

  "/send/media": async (userId, body) => whatsappService.sendMedia(userId, body),

  "/send/menu": async (userId, body) => whatsappService.sendMenu(userId, body),

  "/message/react": async (userId, body) => whatsappService.reactMessage(userId, {
    number: String(body.number || body.chatid || ""),
    text: String(body.text || body.emoji || ""),
    id: String(body.id || body.messageid || ""),
  }),

  "/message/delete": async (userId, body) => wuzapiHttp.postUser(userId, "/chat/delete", {
    Id: String(body.id || body.messageid || ""),
    Phone: normalizePhone(String(body.number || body.chatid || "")),
  }),

  "/message/edit": async (userId, body) => whatsappService.editMessage(userId, {
    id: String(body.id || ""),
    text: String(body.text || body.body || ""),
    number: String(body.number || body.chatid || ""),
  } as any),

  "/message/pin": async (userId, body) => whatsappService.pinMessage(userId, {
    id: String(body.id || body.messageid || ""),
    pin: body.pin !== false,
  } as any),

  "/message/markread": async (userId, body) => {
    const mapped = mapMarkReadBody(body);
    return whatsappService.markRead(userId, mapped.Id);
  },

  "/message/download": async (userId, body) => whatsappService.downloadMedia(userId, body),

  "/message/find": async (userId, body) => whatsappService.findMessages(userId, body),

  "/chat/find": async (userId, body) => whatsappService.findChats(userId, body),

  "/chat/details": async (userId, body) => whatsappService.getChatDetails(userId, {
    number: String(body.number || body.chatid || body.id || ""),
    preview: body.preview !== false,
  }),

  "/chat/read": async (userId, body) => whatsappService.readChat(userId, {
    number: String(body.number || body.chatid || ""),
    read: body.read !== false,
  }),

  "/chat/pin": async (userId, body) => whatsappService.pinChat(userId, {
    number: String(body.number || body.chatid || ""),
    pin: Boolean(body.pin),
  }),

  "/chat/check": async (userId, body) => {
    const numbers = Array.isArray(body.numbers)
      ? body.numbers.map(String)
      : [String(body.number || body.phone || "")].filter(Boolean);
    return whatsappService.checkNumbers(userId, numbers);
  },

  "/chat/block": async (userId, body) => whatsappService.blockContact(userId, {
    number: String(body.number || body.chatid || ""),
    block: body.block !== false,
  }),

  "/contacts/list": async (userId, body) => whatsappService.listContacts(userId, body as any),
};

export const wuzapiProxyService = new WuzapiProxyService();
