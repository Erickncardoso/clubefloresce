/**
 * Integração WuzAPI v3 — implementação completa conforme documentação oficial.
 * https://webhook.erickcardoso.com.br/api
 */
import dotenv from "dotenv";
import { getDevTunnelWebhookUrl } from "../../utils/dev-tunnel-url";
import {
  normalizeUazapiChatJid,
  normalizeUazapiMessageId,
  normalizeUazapiMessageTimestamp,
} from "../../utils/uazapi-message-ingest.util";
import {
  assertWuzapiConfigured,
  getWuzapiUserToken,
  getWhatsappProviderLabel,
  isWuzapiProvider,
  resolveWhatsappDatastoreUserId,
} from "../../config/whatsapp-provider.config";
import { WhatsappChatRepository } from "../../repositories/whatsapp_chat.repository";
import { WhatsappMessageRepository } from "../../repositories/whatsapp_message.repository";
import { WhatsappContactDirectoryRepository } from "../../repositories/whatsapp_contact_directory.repository";
import { WhatsappContactStateRepository } from "../../repositories/whatsapp_contact_state.repository";
import { WhatsappGroupObservedSendersRepository } from "../../repositories/whatsapp_group_observed_senders.repository";
import { WhatsappMediaArchiveRepository } from "../../repositories/whatsapp_media_archive.repository";
import whatsappSessionService, { extractSessionJidFromStatusPayload } from "../whatsapp-session.service";
import whatsappPusherService from "../whatsapp-pusher.service";
import { wuzapiHttp } from "./wuzapi-http.client";
import { wuzapiAdmin, wuzapiForUser, WUZAPI_WEBHOOK_EVENTS, type WuzapiAdminApi, type WuzapiApi } from "./wuzapi-api";
import {
  dataUriFromBase64,
  isGroupJid,
  mapChatDetailsToUaz,
  mapContactsRecordToUazChats,
  mapConversationSummaryToUazChat,
  mapMarkReadBody,
  mapSendMediaBody,
  mapSendTextBody,
  mapUserCheckToUaz,
  mapWuzHistoryRowToUazMessage,
  normalizePhone,
  toChatJid,
  toGroupJid,
  unsupportedUazFeature,
} from "./wuzapi-mappers";

dotenv.config();

const chatRepository = new WhatsappChatRepository();
const messageRepository = new WhatsappMessageRepository();
const contactDirectoryRepository = new WhatsappContactDirectoryRepository();
const contactStateRepository = new WhatsappContactStateRepository();
const groupObservedSendersRepository = new WhatsappGroupObservedSendersRepository();
const mediaArchiveRepository = new WhatsappMediaArchiveRepository();

const WEBHOOK_EVENTS = WUZAPI_WEBHOOK_EVENTS.filter((e) => e !== "All");

export class WuzapiWhatsappService {
  /** Cliente com todos os endpoints Swagger WuzAPI. */
  api(userId: string) {
    return wuzapiForUser(userId);
  }

  private webhookUrl(): string {
    const explicit = String(process.env.WHATSAPP_WEBHOOK_URL || "").trim();
    if (explicit) return explicit.replace(/\/+$/, "");
    const backendPublic = String(process.env.BACKEND_PUBLIC_URL || "").trim();
    if (!backendPublic) {
      const tunnel = getDevTunnelWebhookUrl();
      if (tunnel) return tunnel;
    }
    return `${backendPublic.replace(/\/+$/, "")}/api/whatsapp/webhook`;
  }

  private mapSessionStatus(data: any) {
    const connected = Boolean(data?.Connected ?? data?.connected);
    const loggedIn = Boolean(data?.LoggedIn ?? data?.loggedIn);
    let connectionStatus = "disconnected";
    if (connected && loggedIn) connectionStatus = "connected";
    else if (connected) connectionStatus = "connecting";
    return { connected, loggedIn, connectionStatus };
  }

  private isAlreadyConnectedError(err: unknown): boolean {
    const msg = String((err as Error)?.message || err || "").toLowerCase();
    return msg.includes("already connected");
  }

  private extractQrFromSessionPayload(payload: any): string {
    const data = payload && typeof payload === "object" ? payload : {};
    return String(
      data.qrcode
      || data.QRCode
      || data.qr
      || data.base64
      || "",
    ).trim();
  }

  private async fetchSessionQr(userId: string): Promise<string> {
    try {
      const qrBody = await this.api(userId).qr();
      return this.extractQrFromSessionPayload(this.unwrap(qrBody));
    } catch {
      return "";
    }
  }

  private dataUserId(authUserId: string): string {
    return resolveWhatsappDatastoreUserId(authUserId);
  }

  private async purgeAllLocalData(userId: string): Promise<void> {
    const dataUserId = this.dataUserId(userId);
    await Promise.all([
      messageRepository.deleteAllByUser(dataUserId),
      chatRepository.deleteAllByUser(dataUserId),
      contactStateRepository.deleteAllByUser(dataUserId),
      groupObservedSendersRepository.deleteAllByUser(dataUserId),
      contactDirectoryRepository.deleteByUserId(dataUserId),
      mediaArchiveRepository.deleteAllByUser(dataUserId),
    ]);
  }

  private async enforceSessionScopedData(userId: string, sessionJid: string): Promise<void> {
    const dataUserId = this.dataUserId(userId);
    const normalized = String(sessionJid || "").trim().toLowerCase();
    if (!normalized) return;
    await Promise.all([
      messageRepository.deleteNotMatchingSession(dataUserId, normalized),
      chatRepository.deleteNotMatchingSession(dataUserId, normalized),
    ]);
  }

  private async claimOrphanSessionData(userId: string, sessionJid: string): Promise<void> {
    const dataUserId = this.dataUserId(userId);
    const normalized = String(sessionJid || "").trim().toLowerCase();
    if (!normalized) return;
    await Promise.all([
      messageRepository.assignSessionJidToOrphans(dataUserId, normalized),
      chatRepository.assignSessionJidToOrphans(dataUserId, normalized),
    ]);
  }

  private async fetchConnectedProfilePic(userId: string, sessionJid: string): Promise<string> {
    const phone = normalizePhone(sessionJid);
    if (!phone) return "";
    try {
      const avatarBody = await wuzapiHttp.postUser(userId, "/user/avatar", { Phone: phone, Preview: true });
      const avatar = this.unwrap(avatarBody);
      return String(avatar?.URL || avatar?.url || avatar?.Url || "").trim();
    } catch {
      return "";
    }
  }

  private async notifySessionReset(userId: string, reason: string): Promise<void> {
    void whatsappPusherService.notifySessionReset(this.dataUserId(userId), reason);
  }

  private async syncSessionBinding(
    userId: string,
    sessionJid: string,
    reason: string,
  ): Promise<{ purged: boolean; previousJid: string | null; nextJid: string }> {
    const dataUserId = this.dataUserId(userId);
    const result = await whatsappSessionService.ensureSessionIsolation(
      dataUserId,
      sessionJid,
      () => this.purgeAllLocalData(userId),
    );
    if (result.purged) {
      await this.enforceSessionScopedData(userId, result.nextJid);
      await this.notifySessionReset(userId, reason);
    } else if (result.nextJid) {
      await this.claimOrphanSessionData(userId, result.nextJid);
    }
    return result;
  }

  private async buildStatusResponse(userId: string, payload: any) {
    const { connectionStatus, loggedIn } = this.mapSessionStatus(payload);
    let qrcode = this.extractQrFromSessionPayload(payload);
    if (!loggedIn && !qrcode) {
      qrcode = await this.fetchSessionQr(userId);
    }

    const jid = extractSessionJidFromStatusPayload(payload)
      || String(payload?.jid || payload?.JID || "").trim();
    let sessionPurged = false;
    let previousSessionJid: string | null = null;
    let profilePicUrl = "";

    if (loggedIn && jid) {
      await this.ensureRealtimeWebhook(userId);
      void this.requestInitialHistorySync(userId);
      void this.bootstrapConversationsFromWuzapi(userId);
      const binding = await this.syncSessionBinding(userId, jid, "status-login");
      sessionPurged = binding.purged;
      previousSessionJid = binding.previousJid;
      profilePicUrl = await this.fetchConnectedProfilePic(userId, jid);
    }

    return {
      provider: "wuzapi",
      connectionStatus,
      qrcode: qrcode || undefined,
      jid: jid || undefined,
      sessionJid: jid || undefined,
      sessionPurged,
      previousSessionJid,
      profilePicUrl: profilePicUrl || undefined,
      profilePictureUrl: profilePicUrl || undefined,
      instance: {
        provider: "wuzapi",
        profileName: jid ? jid.split("@")[0] : String(payload?.name || "WuzAPI"),
        profilePicUrl: profilePicUrl || undefined,
        profilePictureUrl: profilePicUrl || undefined,
        plataform: "WhatsApp",
        connectionStatus,
        loggedIn,
        connected: Boolean(payload?.connected ?? payload?.Connected),
        jid: jid || undefined,
      },
      status: payload,
      message: loggedIn
        ? "WhatsApp conectado via WuzAPI."
        : qrcode
          ? "Escaneie o QR Code para conectar via WuzAPI."
          : "Aguardando QR Code da WuzAPI.",
    };
  }

  private unwrap(body: any) {
    return wuzapiHttp.unwrap(body);
  }

  // ─── Admin / instância (compat UAZAPI) ─────────────────────────────────────

  invalidateAllInstancesCache(): void { /* no-op */ }
  invalidateInstanceTokenCache(_userId?: string): void { /* no-op */ }

  async cleanupDuplicateInstancesForUser(_userId: string): Promise<number> { return 0; }
  async removeAllInstancesForUser(_userId: string): Promise<{ deletedCount: number }> { return { deletedCount: 0 }; }

  async getInstanceToken(_userId: string): Promise<string | null> {
    return getWuzapiUserToken() || null;
  }

  async getInstanceInfo(_userId: string): Promise<{ token: string; name: string } | null> {
    const token = getWuzapiUserToken();
    return token ? { token, name: "wuzapi" } : null;
  }

  async ensureInstanceLinkedToUser(_inst: any, _userId: string): Promise<void> { /* no-op */ }

  async resolveUserIdByInstanceRef(_instanceRef: string): Promise<string | null> {
    return String(process.env.WUZAPI_DEFAULT_USER_ID || "").trim() || null;
  }

  async listConnectedClubInstances(): Promise<Array<{ userId: string; token: string }>> {
    const mapped = String(process.env.WUZAPI_DEFAULT_USER_ID || "").trim();
    const token = getWuzapiUserToken();
    if (!mapped || !token) return [];
    try {
      const body = await wuzapiHttp.getUser(mapped, "/session/status");
      const data = this.unwrap(body);
      if (data?.loggedIn || data?.LoggedIn) return [{ userId: mapped, token }];
    } catch { /* ignore */ }
    return [];
  }

  async refreshMobilePresenceForAllConnectedInstances(): Promise<void> {
    const mapped = String(process.env.WUZAPI_DEFAULT_USER_ID || "").trim();
    if (!mapped) return;
    try {
      await wuzapiHttp.postUser(mapped, "/user/presence", { type: "unavailable" });
    } catch { /* ignore */ }
  }

  async ensureMobileNotificationsFriendly(userId: string, _force = false): Promise<void> {
    try {
      await wuzapiHttp.postUser(userId, "/user/presence", { type: "unavailable" });
    } catch { /* ignore */ }
  }

  async createInstanceManual(userId: string, _customName?: string): Promise<any> {
    return this.connect(userId);
  }

  async deleteInstance(_name: string, _userId?: string): Promise<{ success: boolean; message?: string; deletedCount?: number }> {
    return { success: true, deletedCount: 0, message: "WuzAPI não usa instâncias UAZAPI." };
  }

  async deleteInstancesForUser(userId: string): Promise<{ success: boolean; deletedCount: number; message?: string }> {
    await this.disconnect(userId);
    return { success: true, deletedCount: 0 };
  }

  async getSseUrl(): Promise<string> {
    throw new Error("WuzAPI não expõe SSE UAZAPI. Use webhook + Pusher.");
  }

  // ─── Sessão ────────────────────────────────────────────────────────────────

  async ensureRealtimeWebhook(userId: string): Promise<boolean> {
    assertWuzapiConfigured();
    const url = this.webhookUrl();
    if (!url) {
      console.warn("[WuzAPI] WHATSAPP_WEBHOOK_URL/BACKEND_PUBLIC_URL ausente — eventos não chegam ao backend.");
      return false;
    }

    try {
      const current = this.unwrap(await this.api(userId).getWebhook());
      const currentUrl = String(current?.webhook || "").trim();
      if (currentUrl === url) return true;

      await this.api(userId).setWebhook({ webhook: url, events: [...WEBHOOK_EVENTS] });
      const after = this.unwrap(await this.api(userId).getWebhook());
      const afterUrl = String(after?.webhook || "").trim();
      if (!afterUrl) {
        console.error("[WuzAPI] Webhook permanece vazio após setWebhook. URL tentada:", url);
        return false;
      }
      if (afterUrl !== url) {
        console.warn("[WuzAPI] Webhook configurado com URL diferente da esperada:", afterUrl);
      } else {
        console.log("[WuzAPI] Webhook configurado:", afterUrl);
      }
      return true;
    } catch (err: any) {
      console.warn("[WuzAPI] Falha ao configurar webhook:", err?.message || err);
      return false;
    }
  }

  private async requestInitialHistorySync(userId: string): Promise<void> {
    try {
      await wuzapiHttp.getUser(userId, "/session/history", { count: 100 });
    } catch (err: any) {
      console.warn("[WuzAPI] Falha ao solicitar history sync inicial:", err?.message || err);
    }
  }

  async getStatus(userId: string): Promise<any> {
    try {
      assertWuzapiConfigured();
      const body = await this.api(userId).status();
      const payload = this.unwrap(body);
      return this.buildStatusResponse(userId, payload);
    } catch (err: any) {
      return {
        provider: "wuzapi",
        status: "error",
        connectionStatus: "disconnected",
        instance: null,
        message: err?.message || "Falha ao consultar WuzAPI.",
      };
    }
  }

  async connect(userId: string, _phone?: string): Promise<any> {
    assertWuzapiConfigured();
    await this.ensureRealtimeWebhook(userId);

    const before = this.unwrap(await this.api(userId).status());
    const { connected, loggedIn } = this.mapSessionStatus(before);
    if (loggedIn) return this.buildStatusResponse(userId, before);

    if (!connected) {
      try {
        await this.api(userId).connect({ Subscribe: [...WEBHOOK_EVENTS], Immediate: false });
      } catch (err) {
        if (!this.isAlreadyConnectedError(err)) throw err;
      }
    }

    return this.getStatus(userId);
  }

  async regenerateQrCode(userId: string): Promise<any> {
    assertWuzapiConfigured();
    await this.ensureRealtimeWebhook(userId);

    const before = this.unwrap(await this.api(userId).status());
    const { connected, loggedIn } = this.mapSessionStatus(before);

    if (loggedIn) {
      throw new Error("WhatsApp já está conectado. Desconecte a sessão antes de gerar um novo QR.");
    }

    await whatsappSessionService.purgeStalePairingData(this.dataUserId(userId), () => this.purgeAllLocalData(userId));
    await this.notifySessionReset(userId, "new-qr-pairing");

    if (connected) {
      const current = await this.buildStatusResponse(userId, before);
      if (current.qrcode) return current;

      await this.api(userId).disconnect(false);
      try {
        await this.api(userId).connect({ Subscribe: [...WEBHOOK_EVENTS], Immediate: false });
      } catch (err) {
        if (!this.isAlreadyConnectedError(err)) throw err;
      }
      return this.getStatus(userId);
    }

    return this.connect(userId);
  }

  async refreshQrCode(userId: string): Promise<any> {
    return this.getStatus(userId);
  }

  async disconnectSession(userId: string): Promise<any> {
    await this.api(userId).disconnect();
    return { ok: true };
  }

  async disconnect(userId: string): Promise<any> {
    await this.api(userId).logout();
    // WuzAPI guarda o histórico — não apagar DB local no logout (só troca de conta).
    await whatsappSessionService.clearSessionBinding(this.dataUserId(userId));
    await this.notifySessionReset(userId, "logout");
    return { ok: true, message: "WhatsApp desconectado via WuzAPI." };
  }

  async purgeLocalSessionData(userId: string): Promise<void> {
    await this.purgeAllLocalData(userId);
    await whatsappSessionService.clearSessionBinding(this.dataUserId(userId));
  }

  /** Só apaga dados locais — binding fica a cargo de ensureSessionIsolation. */
  async purgeWhatsappDatastore(userId: string): Promise<void> {
    await this.purgeAllLocalData(userId);
  }

  async resetInstance(userId: string): Promise<any> {
    await this.disconnect(userId);
    return this.connect(userId);
  }

  async updatePresence(userId: string, presence: "available" | "unavailable"): Promise<any> {
    return wuzapiHttp.postUser(userId, "/user/presence", { type: presence });
  }

  async getPrivacySettings(userId: string): Promise<any> {
    return wuzapiHttp.getUser(userId, "/user/privacy");
  }

  async updatePrivacySettings(userId: string, privacyData: { Name: string; Value: string }): Promise<any> {
    return wuzapiHttp.postUser(userId, "/user/privacy", privacyData);
  }

  // ─── Mensagens ─────────────────────────────────────────────────────────────

  async sendText(userId: string, data: any): Promise<any> {
    const payload = mapSendTextBody(data || {});
    return wuzapiHttp.postUser(userId, "/chat/send/text", payload, 20000);
  }

  async sendMedia(userId: string, data: any): Promise<any> {
    const mapped = mapSendMediaBody(data || {});
    const api = this.api(userId);
    switch (mapped.api) {
      case "chatSendSticker": return api.chatSendSticker(mapped.payload);
      case "chatSendTemplate": return api.chatSendTemplate(mapped.payload);
      case "chatSendVideo": return api.chatSendVideo(mapped.payload);
      case "chatSendAudio": return api.chatSendAudio(mapped.payload);
      case "chatSendDocument": return api.chatSendDocument(mapped.payload);
      default: return api.chatSendImage(mapped.payload);
    }
  }

  async sendContact(userId: string, data: any): Promise<any> {
    const phone = normalizePhone(String(data?.number || data?.chatid || ""));
    return wuzapiHttp.postUser(userId, "/chat/send/contact", {
      Phone: phone,
      Name: String(data?.fullName || data?.name || "Contato"),
      Vcard: String(data?.vcard || data?.Vcard || ""),
      Id: data?.id,
    });
  }

  async sendLocation(userId: string, data: any): Promise<any> {
    return wuzapiHttp.postUser(userId, "/chat/send/location", {
      Phone: normalizePhone(String(data?.number || data?.chatid || "")),
      Name: String(data?.name || ""),
      Latitude: Number(data?.latitude || data?.lat),
      Longitude: Number(data?.longitude || data?.lng || data?.lon),
      Id: data?.id,
    });
  }

  async sendPresence(userId: string, data: { number: string; presence: "composing" | "recording" | "paused" }): Promise<any> {
    const media = data.presence === "recording" ? "audio" : undefined;
    return wuzapiHttp.postUser(userId, "/chat/presence", {
      Phone: normalizePhone(data.number),
      State: data.presence === "paused" ? "paused" : data.presence,
      Media: media,
    });
  }

  async sendStatus(userId: string, data: any): Promise<any> {
    return wuzapiHttp.postUser(userId, "/status/set/text", { body: String(data?.text || data?.body || "") });
  }

  async sendMenu(userId: string, data: any): Promise<any> {
    const buttons = Array.isArray(data?.buttons) ? data.buttons : [];
    if (buttons.length) {
      return wuzapiHttp.postUser(userId, "/chat/send/buttons", {
        Phone: normalizePhone(String(data?.number || "")),
        Body: String(data?.text || data?.body || ""),
        Title: String(data?.title || ""),
        Footer: String(data?.footer || ""),
        Buttons: buttons,
        Id: data?.id,
      });
    }
    return wuzapiHttp.postUser(userId, "/chat/send/list", {
      Phone: normalizePhone(String(data?.number || "")),
      ButtonText: String(data?.buttonText || "Escolher"),
      Desc: String(data?.text || data?.body || ""),
      TopText: String(data?.title || ""),
      FooterText: String(data?.footer || ""),
      Sections: data?.sections || [],
      List: data?.list || [],
      Id: data?.id,
    });
  }

  async sendCarousel(_userId: string, _data: any): Promise<any> {
    return unsupportedUazFeature("sendCarousel");
  }

  async requestLocation(_userId: string, _data: any): Promise<any> {
    return unsupportedUazFeature("requestLocation");
  }

  async requestPayment(_userId: string, _data: any): Promise<any> {
    return unsupportedUazFeature("requestPayment");
  }

  async sendPixButton(_userId: string, _data: any): Promise<any> {
    return unsupportedUazFeature("sendPixButton");
  }

  async reactMessage(userId: string, data: { number: string; text: string; id: string }): Promise<any> {
    return wuzapiHttp.postUser(userId, "/chat/react", {
      Phone: normalizePhone(data.number),
      Body: data.text,
      Id: data.id,
    });
  }

  async markRead(userId: string, ids: string[]): Promise<any> {
    return wuzapiHttp.postUser(userId, "/chat/markread", {
      Id: ids,
      ChatPhone: "",
      SenderPhone: "",
    });
  }

  async markMessagePlayed(userId: string, ids: string[]): Promise<any> {
    return this.markRead(userId, ids);
  }

  async deleteMessage(userId: string, id: string): Promise<any> {
    return wuzapiHttp.postUser(userId, "/chat/delete", { Id: id, Phone: "" });
  }

  async editMessage(userId: string, data: { id: string; text: string; number?: string }): Promise<any> {
    return wuzapiHttp.postUser(userId, "/chat/send/edit", {
      Id: data.id,
      Phone: normalizePhone(String(data.number || "")),
      Body: data.text,
    });
  }

  async pinMessage(_userId: string, _data: any): Promise<any> {
    return unsupportedUazFeature("pinMessage");
  }

  async findMessages(userId: string, data: any): Promise<any> {
    const chatJid = toChatJid(String(data?.chatid || data?.chatId || data?.number || ""));
    const limit = Math.min(200, Math.max(1, Number(data?.limit || 50)));
    const offset = Math.max(0, Number(data?.offset || 0));
    const messageId = String(data?.id || data?.messageid || "").trim();

    if (!chatJid && messageId) {
      return { messages: [] };
    }

    const body = await wuzapiHttp.getUser(userId, "/chat/history", {
      chat_jid: chatJid,
      limit: limit + offset,
    });
    const rows = Array.isArray(this.unwrap(body)) ? this.unwrap(body) : [];
    let messages = rows.map((row: any) => mapWuzHistoryRowToUazMessage(row, chatJid));
    if (messageId) messages = messages.filter((m: Record<string, unknown>) => String(m.messageid) === messageId);
    if (offset > 0) messages = messages.slice(offset);
    messages = messages.slice(0, limit);
    return { messages };
  }

  async historySync(userId: string, data: { number: string; messageid?: string; count?: number }): Promise<any> {
    const chatJid = toChatJid(data.number) || toGroupJid(data.number);
    return wuzapiHttp.getUser(userId, "/session/history", {
      count: Math.min(100, Math.max(1, Number(data.count || 50))),
      chat_jid: chatJid,
      oldest_msg_id: data.messageid,
    });
  }

  async downloadMedia(userId: string, data: any): Promise<any> {
    const mime = String(data?.mimetype || data?.mimeType || "").toLowerCase();
    const payload = {
      Url: data?.url || data?.Url,
      DirectPath: data?.directPath || data?.DirectPath,
      MediaKey: data?.mediaKey || data?.MediaKey,
      Mimetype: mime,
      FileEncSHA256: data?.fileEncSha256 || data?.FileEncSHA256,
      FileSHA256: data?.fileSha256 || data?.FileSHA256,
      FileLength: Number(data?.fileLength || data?.FileLength || 0),
    };
    if (mime.includes("video")) return wuzapiHttp.postUser(userId, "/chat/downloadvideo", payload, 45000);
    if (mime.includes("audio") || mime.includes("ogg")) return wuzapiHttp.postUser(userId, "/chat/downloadaudio", payload, 45000);
    if (mime.includes("webp") && mime.includes("sticker")) return wuzapiHttp.postUser(userId, "/chat/downloadsticker", payload, 45000);
    if (mime.includes("image")) return wuzapiHttp.postUser(userId, "/chat/downloadimage", payload, 45000);
    return wuzapiHttp.postUser(userId, "/chat/downloaddocument", payload, 45000);
  }

  // ─── Chats ─────────────────────────────────────────────────────────────────

  private async fetchContactsMap(userId: string): Promise<Map<string, Record<string, unknown>>> {
    const map = new Map<string, Record<string, unknown>>();
    try {
      const contactsBody = await wuzapiHttp.getUser(userId, "/user/contacts");
      const contacts = this.unwrap(contactsBody) || {};
      for (const [jid, info] of Object.entries(contacts as Record<string, unknown>)) {
        if (info && typeof info === "object") {
          map.set(String(jid).trim().toLowerCase(), info as Record<string, unknown>);
        }
      }
    } catch { /* ignore */ }
    return map;
  }

  private async fetchGroupsMap(userId: string): Promise<Map<string, Record<string, unknown>>> {
    const map = new Map<string, Record<string, unknown>>();
    try {
      const groupsBody = await wuzapiHttp.getUser(userId, "/group/list");
      const groups = this.unwrap(groupsBody)?.Groups || this.unwrap(groupsBody)?.groups || [];
      for (const group of Array.isArray(groups) ? groups : []) {
        const row = (group && typeof group === "object" ? group : {}) as Record<string, unknown>;
        const jid = String(row.JID || row.jid || row.GroupJID || "").trim().toLowerCase();
        if (jid) map.set(jid, row);
      }
    } catch { /* ignore */ }
    return map;
  }

  private async syncChatRowsFromMessages(userId: string): Promise<void> {
    const dataUserId = this.dataUserId(userId);
    const boundSessionJid = await whatsappSessionService.getBoundSessionJid(dataUserId);
    const summaries = await messageRepository.listConversationSummaries(dataUserId, 500, boundSessionJid);
    if (!summaries.length) {
      await chatRepository.deleteWithoutConversation(dataUserId);
      return;
    }

    const [contactsMap, groupsMap, cachedRows] = await Promise.all([
      this.fetchContactsMap(userId),
      this.fetchGroupsMap(userId),
      chatRepository.listByUser(dataUserId),
    ]);
    const cachedByJid = new Map(cachedRows.map((row) => [row.chatJid.toLowerCase(), row]));

    const inputs = summaries.map((summary) => {
      const jid = summary.chatJid.toLowerCase();
      const uaz = mapConversationSummaryToUazChat(
        summary,
        contactsMap.get(jid),
        groupsMap.get(jid),
        cachedByJid.get(jid),
      );
      const ts = Number(uaz.wa_lastMsgTimestamp || 0);
      return {
        chatJid: jid,
        sessionJid: boundSessionJid,
        name: String(uaz.name || ""),
        pushName: String(uaz.wa_contactName || uaz.wa_name || ""),
        avatarUrl: String(uaz.avatarUrl || uaz.image || uaz.imagePreview || ""),
        isGroup: Boolean(uaz.wa_isGroup),
        lastMessage: String(uaz.wa_lastMsgText || ""),
        lastMessageTime: ts > 0 ? BigInt(ts) : null,
        unreadCount: Number(uaz.wa_unreadCount || 0),
        raw: uaz,
      };
    });

    await chatRepository.upsertMany(dataUserId, inputs);
    await chatRepository.deleteWithoutConversation(dataUserId);
  }

  /** Preview ao vivo via /chat/history — fonte principal no modo WuzAPI direto. */
  private async fetchLiveConversationSummaries(
    userId: string,
    chatJids: string[],
    maxChats = 60,
    batchSize = 8,
  ): Promise<Array<{
    chatJid: string;
    messageTimestamp: bigint;
    fromMe: boolean;
    raw: unknown;
  }>> {
    const summaries: Array<{
      chatJid: string;
      messageTimestamp: bigint;
      fromMe: boolean;
      raw: unknown;
    }> = [];
    const uniqueJids = Array.from(new Set(
      chatJids.map((jid) => String(jid || "").trim().toLowerCase()).filter(Boolean),
    )).slice(0, maxChats);

    for (let i = 0; i < uniqueJids.length; i += batchSize) {
      const batch = uniqueJids.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (jid) => {
          const page = await this.findMessages(userId, { chatid: jid, limit: 1 });
          const messages = Array.isArray(page?.messages) ? page.messages : [];
          if (!messages.length) return null;
          const msg = messages.reduce((best: Record<string, unknown>, cur: Record<string, unknown>) => (
            Number(cur.messageTimestamp || 0) > Number(best.messageTimestamp || 0) ? cur : best
          ));
          const ts = Number(msg.messageTimestamp || 0);
          if (!ts) return null;
          return {
            chatJid: jid,
            messageTimestamp: BigInt(ts),
            fromMe: Boolean(msg.fromMe),
            raw: msg.raw || msg,
          };
        }),
      );
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) summaries.push(result.value);
      }
    }

    return summaries;
  }

  /** Primeira carga: puxa histórico recente dos grupos para popular conversas reais. */
  private async bootstrapConversationsFromWuzapi(userId: string): Promise<void> {
    const dataUserId = this.dataUserId(userId);
    const boundSessionJid = await whatsappSessionService.getBoundSessionJid(dataUserId);
    try {
      const groupsBody = await wuzapiHttp.getUser(userId, "/group/list");
      const groups = this.unwrap(groupsBody)?.Groups || this.unwrap(groupsBody)?.groups || [];
      const list = Array.isArray(groups) ? groups.slice(0, 40) : [];
      if (!list.length) return;

      for (const group of list) {
        const row = (group && typeof group === "object" ? group : {}) as Record<string, unknown>;
        const jid = String(row.JID || row.jid || row.GroupJID || "").trim();
        if (!jid) continue;
        try {
          const page = await this.findMessages(userId, { chatid: jid, limit: 20 });
          const messages = Array.isArray(page?.messages) ? page.messages : [];
          const mapped = messages
            .map((raw: Record<string, unknown>) => ({
              chatJid: normalizeUazapiChatJid(raw, jid),
              messageId: normalizeUazapiMessageId(raw),
              messageTimestamp: normalizeUazapiMessageTimestamp(raw),
              fromMe: Boolean(raw.fromMe),
              sessionJid: boundSessionJid,
              raw,
            }))
            .filter((item: { messageId: string; chatJid: string }) => item.messageId && item.chatJid);
          if (mapped.length) {
            await messageRepository.upsertMany(dataUserId, mapped);
          }
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }

  async findChats(userId: string, data: any = {}): Promise<any> {
    const dataUserId = this.dataUserId(userId);
    const limit = Math.min(1000, Math.max(1, Number(data?.limit || 300)));
    const offset = Math.max(0, Number(data?.offset || 0));
    const wantGroups = data?.wa_isGroup === true;
    const wantPrivate = data?.wa_isGroup === false;

    const [contactsMap, groupsMap, cachedRows] = await Promise.all([
      this.fetchContactsMap(userId),
      this.fetchGroupsMap(userId),
      chatRepository.listByUser(dataUserId),
    ]);
    const cachedByJid = new Map(cachedRows.map((row) => [row.chatJid.toLowerCase(), row]));

    // WuzAPI ao vivo + cache local (webhooks/history). Só conversas com mensagem real (ts > 0).
    const filterRealSummaries = (
      rows: Array<{ chatJid: string; messageTimestamp: bigint; fromMe: boolean; raw: unknown }>,
    ) => rows.filter((summary) => Number(summary.messageTimestamp || 0) > 0);

    let dbSummaries = await messageRepository.listConversationSummaries(dataUserId, 500, null);
    const probeJids = new Set<string>([
      ...Array.from(groupsMap.keys()),
      ...dbSummaries.map((row) => row.chatJid.toLowerCase()),
    ]);
    let liveSummaries: typeof dbSummaries = [];
    try {
      liveSummaries = await this.fetchLiveConversationSummaries(userId, Array.from(probeJids));
    } catch (error) {
      console.warn("[WuzAPI] findChats live preview falhou:", (error as Error)?.message || error);
    }

    if (
      filterRealSummaries(liveSummaries).length === 0
      && filterRealSummaries(dbSummaries).length === 0
    ) {
      await this.bootstrapConversationsFromWuzapi(userId);
      dbSummaries = await messageRepository.listConversationSummaries(dataUserId, 500, null);
      try {
        const retryJids = new Set<string>([
          ...Array.from(groupsMap.keys()),
          ...dbSummaries.map((row) => row.chatJid.toLowerCase()),
        ]);
        liveSummaries = await this.fetchLiveConversationSummaries(userId, Array.from(retryJids));
      } catch { /* ignore */ }
    }

    const mergedSummaries = new Map<string, typeof dbSummaries[number]>();
    for (const summary of filterRealSummaries(dbSummaries)) {
      mergedSummaries.set(summary.chatJid.toLowerCase(), summary);
    }
    for (const summary of filterRealSummaries(liveSummaries)) {
      const key = summary.chatJid.toLowerCase();
      const existing = mergedSummaries.get(key);
      if (!existing || Number(summary.messageTimestamp) > Number(existing.messageTimestamp)) {
        mergedSummaries.set(key, summary);
      }
    }

    let chats = Array.from(mergedSummaries.values()).map((summary) => {
      const jid = summary.chatJid.toLowerCase();
      return mapConversationSummaryToUazChat(
        summary,
        contactsMap.get(jid),
        groupsMap.get(jid),
        cachedByJid.get(jid),
      );
    });

    if (wantGroups) {
      chats = chats.filter((chat) => isGroupJid(String(chat.wa_chatid || chat.chatid || "")));
    }
    if (wantPrivate) {
      chats = chats.filter((chat) => !isGroupJid(String(chat.wa_chatid || chat.chatid || "")));
    }

    chats.sort(
      (a, b) => Number(b.wa_lastMsgTimestamp || 0) - Number(a.wa_lastMsgTimestamp || 0),
    );

    const page = chats.slice(offset, offset + limit);
    return {
      chats: page,
      pagination: {
        totalRecords: chats.length,
        limit,
        offset,
      },
    };
  }

  async getChatDetails(userId: string, data: { number: string; preview?: boolean }): Promise<any> {
    const target = String(data?.number || "").trim();
    const phone = normalizePhone(target);
    const preview = data?.preview !== false;

    const [avatarBody, infoBody] = await Promise.allSettled([
      wuzapiHttp.postUser(userId, "/user/avatar", { Phone: phone, Preview: preview }),
      wuzapiHttp.postUser(userId, "/user/info", { Phone: [phone] }),
    ]);

    const avatar = avatarBody.status === "fulfilled" ? wuzapiHttp.unwrap(avatarBody.value) : {};
    const info = infoBody.status === "fulfilled" ? wuzapiHttp.unwrap(infoBody.value) : {};
    return mapChatDetailsToUaz(target, avatar, info);
  }

  async deleteChat(_userId: string, _data: any): Promise<any> {
    return unsupportedUazFeature("deleteChat");
  }

  async archiveChat(_userId: string, _data: any): Promise<any> {
    return unsupportedUazFeature("archiveChat");
  }

  async readChat(userId: string, data: { number: string; read: boolean }): Promise<any> {
    if (!data.read) return { ok: true };
    return this.markRead(userId, []);
  }

  async muteChat(_userId: string, _data: any): Promise<any> {
    return unsupportedUazFeature("muteChat");
  }

  async pinChat(_userId: string, _data: any): Promise<any> {
    return unsupportedUazFeature("pinChat");
  }

  async getChatNotes(_userId: string, _data: any): Promise<any> {
    return unsupportedUazFeature("chatNotes");
  }

  async refreshChatNotes(_userId: string, _data: any): Promise<any> {
    return unsupportedUazFeature("chatNotes");
  }

  async editChatNotes(_userId: string, _data: any): Promise<any> {
    return unsupportedUazFeature("chatNotes");
  }

  // ─── Contatos ──────────────────────────────────────────────────────────────

  async getContacts(userId: string, _contactScope?: string): Promise<any> {
    const body = await wuzapiHttp.getUser(userId, "/user/contacts");
    const contacts = this.unwrap(body) || {};
    return { contacts: mapContactsRecordToUazChats(contacts) };
  }

  async listContacts(userId: string, data: any = {}): Promise<any> {
    const all = await this.getContacts(userId);
    const list = Array.isArray(all?.contacts) ? all.contacts : [];
    const offset = Math.max(0, Number(data?.offset || 0));
    const limit = Math.max(1, Number(data?.limit || 1000));
    return { contacts: list.slice(offset, offset + limit) };
  }

  async addContact(_userId: string, _data: any): Promise<any> {
    return unsupportedUazFeature("addContact");
  }

  async removeContact(_userId: string, _data: any): Promise<any> {
    return unsupportedUazFeature("removeContact");
  }

  async checkNumbers(userId: string, numbers: string[]): Promise<any> {
    const body = await wuzapiHttp.postUser(userId, "/user/check", {
      Phone: (numbers || []).map((n) => normalizePhone(String(n))),
    });
    return mapUserCheckToUaz(this.unwrap(body));
  }

  async blockContact(userId: string, data: { number: string; block: boolean }): Promise<any> {
    const phone = normalizePhone(data.number);
    const path = data.block ? "/user/block" : "/user/unblock";
    return wuzapiHttp.postUser(userId, path, { Phone: phone, JID: toChatJid(phone) });
  }

  async getBlockList(userId: string): Promise<any> {
    return wuzapiHttp.getUser(userId, "/user/blocklist");
  }

  // ─── Labels / CRM (UAZAPI-only) ────────────────────────────────────────────

  async manageChatLabels(_userId: string, _data: any): Promise<any> { return unsupportedUazFeature("labels"); }
  async editLabel(_userId: string, _data: any): Promise<any> { return unsupportedUazFeature("labels"); }
  async getLabels(_userId: string): Promise<any> { return { labels: [] }; }
  async refreshLabels(_userId: string, _data: any): Promise<any> { return { labels: [] }; }
  async editChatLead(_userId: string, _data: any): Promise<any> { return unsupportedUazFeature("crm"); }
  async updateInstanceFieldsMap(_userId: string, _data: any): Promise<any> { return unsupportedUazFeature("crm"); }

  // ─── Grupos ────────────────────────────────────────────────────────────────

  async createGroup(userId: string, data: { name: string; participants: string[] }): Promise<any> {
    return wuzapiHttp.postUser(userId, "/group/create", {
      Name: data.name,
      Participants: (data.participants || []).map((p) => normalizePhone(p)),
    });
  }

  async getGroupInfo(userId: string, data: { groupjid: string }): Promise<any> {
    return wuzapiHttp.getUser(userId, "/group/info", { groupJID: data.groupjid });
  }

  async getGroupInviteInfo(userId: string, data: { invitecode: string }): Promise<any> {
    return wuzapiHttp.postUser(userId, "/group/inviteinfo", { Code: data.invitecode });
  }

  async joinGroup(userId: string, data: { invitecode: string }): Promise<any> {
    return wuzapiHttp.postUser(userId, "/group/join", { Code: data.invitecode });
  }

  async leaveGroup(userId: string, data: { groupjid: string }): Promise<any> {
    return wuzapiHttp.postUser(userId, "/group/leave", { GroupJID: data.groupjid });
  }

  async getAllGroups(userId: string, _force?: boolean, _noparticipants?: boolean): Promise<any> {
    return wuzapiHttp.getUser(userId, "/group/list");
  }

  async listGroups(userId: string): Promise<any> {
    return this.getAllGroups(userId);
  }

  async listGroupsPaginated(userId: string, data: any = {}): Promise<any> {
    const body = await this.getAllGroups(userId);
    const groups = this.unwrap(body)?.Groups || [];
    const search = String(data?.search || "").trim().toLowerCase();
    let filtered = Array.isArray(groups) ? groups : [];
    if (search) {
      filtered = filtered.filter((g: any) => String(g?.Name || g?.name || "").toLowerCase().includes(search));
    }
    const offset = Math.max(0, Number(data?.offset || 0));
    const limit = Math.max(1, Number(data?.limit || 100));
    return { groups: filtered.slice(offset, offset + limit), total: filtered.length };
  }

  async resetGroupInviteCode(userId: string, data: { groupjid: string }): Promise<any> {
    return wuzapiHttp.getUser(userId, "/group/invitelink", { groupJID: data.groupjid, reset: true });
  }

  async updateGroupAnnounce(userId: string, data: { groupjid: string; announce: boolean }): Promise<any> {
    return wuzapiHttp.postUser(userId, "/group/announce", { GroupJID: data.groupjid, Announce: data.announce });
  }

  async updateGroupDescription(userId: string, data: { groupjid: string; description: string }): Promise<any> {
    return wuzapiHttp.postUser(userId, "/group/topic", { GroupJID: data.groupjid, Topic: data.description });
  }

  async updateGroupImage(userId: string, data: { groupjid: string; image: string }): Promise<any> {
    return wuzapiHttp.postUser(userId, "/group/photo", {
      GroupJID: data.groupjid,
      Image: dataUriFromBase64("image/jpeg", data.image),
    });
  }

  async updateGroupLocked(userId: string, data: { groupjid: string; locked: boolean }): Promise<any> {
    return wuzapiHttp.postUser(userId, "/group/locked", { GroupJID: data.groupjid, Locked: data.locked });
  }

  async updateGroupName(userId: string, data: { groupjid: string; name: string }): Promise<any> {
    return wuzapiHttp.postUser(userId, "/group/name", { GroupJID: data.groupjid, Name: data.name });
  }

  async updateGroupParticipants(
    userId: string,
    data: { groupjid: string; action: string; participants: string[] },
  ): Promise<any> {
    return wuzapiHttp.postUser(userId, "/group/updateparticipants", {
      GroupJID: data.groupjid,
      Action: data.action,
      Phone: (data.participants || []).map((p) => normalizePhone(p)),
    });
  }

  async createCommunity(_userId: string, _data: any): Promise<any> { return unsupportedUazFeature("community"); }
  async editCommunityGroups(_userId: string, _data: any): Promise<any> { return unsupportedUazFeature("community"); }

  // ─── Quick replies / campanhas (UAZAPI-only) ───────────────────────────────

  async editQuickReply(_userId: string, _data: any): Promise<any> { return unsupportedUazFeature("quickReply"); }
  async getAllQuickReplies(_userId: string): Promise<any> { return []; }
  async createSimpleCampaign(_userId: string, _data: any): Promise<any> { return unsupportedUazFeature("campaign"); }
  async createAdvancedCampaign(_userId: string, _data: any): Promise<any> { return unsupportedUazFeature("campaign"); }
  async editCampaign(_userId: string, _data: any): Promise<any> { return unsupportedUazFeature("campaign"); }
  async clearDoneCampaignMessages(_userId: string, _data: any): Promise<any> { return unsupportedUazFeature("campaign"); }
  async clearAllCampaigns(_userId: string): Promise<any> { return unsupportedUazFeature("campaign"); }
  async listCampaignFolders(_userId: string, _status?: string): Promise<any> { return { folders: [] }; }
  async listCampaignMessages(_userId: string, _data: any): Promise<any> { return { messages: [] }; }

  // ─── Business / fila async (UAZAPI-only) ─────────────────────────────────

  async getBusinessProfile(_userId: string, _jid: string): Promise<any> { return unsupportedUazFeature("business"); }
  async getBusinessCategories(_userId: string): Promise<any> { return unsupportedUazFeature("business"); }
  async updateBusinessProfile(_userId: string, _data: any): Promise<any> { return unsupportedUazFeature("business"); }
  async listCatalogProducts(_userId: string, _jid: string, _after?: string): Promise<any> { return { Products: [] }; }
  async getCatalogProductInfo(_userId: string, _jid: string, _id: string): Promise<any> { return unsupportedUazFeature("business"); }
  async deleteCatalogProduct(_userId: string, _id: string): Promise<any> { return unsupportedUazFeature("business"); }
  async showCatalogProduct(_userId: string, _id: string): Promise<any> { return unsupportedUazFeature("business"); }
  async hideCatalogProduct(_userId: string, _id: string): Promise<any> { return unsupportedUazFeature("business"); }
  async getAsyncMessageQueueStatus(_userId: string): Promise<any> { return { queue: [] }; }
  async clearAsyncMessageQueue(_userId: string): Promise<any> { return { ok: true }; }
  async makeVoiceCall(_userId: string, _number: string, _duration?: number): Promise<any> { return unsupportedUazFeature("voiceCall"); }
  async rejectVoiceCall(userId: string, data: { number?: string; id?: string }): Promise<any> {
    return wuzapiHttp.postUser(userId, "/call/reject", {
      call_from: toChatJid(String(data?.number || "")),
      call_id: String(data?.id || ""),
    });
  }

  async getGlobalWebhook(userId: string): Promise<any> { return this.api(userId).getWebhook(); }
  async setGlobalWebhook(userId: string, url: string, events?: string[]): Promise<any> {
    return this.api(userId).setWebhook({ webhook: url, events: events || [...WEBHOOK_EVENTS] });
  }
  async updateGlobalWebhook(userId: string, url: string, events?: string[], active = true): Promise<any> {
    return this.api(userId).updateWebhook({ webhook: url, events: events || [...WEBHOOK_EVENTS], Active: active });
  }
  async deleteGlobalWebhook(userId: string): Promise<any> { return this.api(userId).deleteWebhook(); }
  async getGlobalWebhookErrors(_userId: string): Promise<any> { return []; }
  async getInstanceWebhook(userId: string): Promise<any> { return this.getGlobalWebhook(userId); }
  async setInstanceWebhook(userId: string, data: { url?: string; webhook?: string; events?: string[] }): Promise<any> {
    return this.setGlobalWebhook(userId, String(data.url || data.webhook || ""), data.events);
  }
  async getInstanceWebhookErrors(_userId: string): Promise<any> { return []; }
  async getAllInstances(): Promise<any[]> {
    const body = await wuzapiAdmin.listUsers();
    return Array.isArray(this.unwrap(body)) ? this.unwrap(body) : [];
  }
  async createInstance(_userId: string, customName?: string): Promise<string | null> {
    const token = getWuzapiUserToken();
    if (!token) return null;
    await wuzapiAdmin.createUser({ name: customName || "Florescer", token });
    return token;
  }
  async deleteWuzapiUser(id: string, full = false): Promise<any> {
    return full ? wuzapiAdmin.deleteUserFull(id) : wuzapiAdmin.deleteUser(id);
  }
  async getWuzapiHealth(): Promise<any> { return wuzapiAdmin.health(); }

  // ─── WuzAPI nativo — todos os endpoints Swagger ────────────────────────────

  wuzHealth() { return wuzapiAdmin.health(); }
  wuzListUsers() { return wuzapiAdmin.listUsers(); }
  wuzCreateUser(body: Parameters<WuzapiAdminApi["createUser"]>[0]) { return wuzapiAdmin.createUser(body); }
  wuzGetUser(id: string) { return wuzapiAdmin.getUser(id); }
  wuzDeleteUser(id: string, full = false) { return full ? wuzapiAdmin.deleteUserFull(id) : wuzapiAdmin.deleteUser(id); }

  wuzNewsletters(userId: string) { return this.api(userId).listNewsletters(); }
  wuzPairPhone(userId: string, phone: string) { return this.api(userId).pairPhone(phone); }
  wuzSessionHistory(userId: string, query: Parameters<WuzapiApi["requestSessionHistory"]>[0]) { return this.api(userId).requestSessionHistory(query); }
  wuzS3Config(userId: string, body?: Record<string, unknown>) {
    return body ? this.api(userId).setS3Config(body) : this.api(userId).getS3Config();
  }
  wuzDeleteS3Config(userId: string) { return this.api(userId).deleteS3Config(); }
  wuzTestS3(userId: string) { return this.api(userId).testS3Connection(); }
  wuzHmacConfig(userId: string, key?: string) {
    if (key) return this.api(userId).setHmacConfig(key);
    return this.api(userId).getHmacConfig();
  }
  wuzDeleteHmac(userId: string) { return this.api(userId).deleteHmacConfig(); }
  wuzUserLid(userId: string, phone: string) { return this.api(userId).userLid(phone); }
  wuzSendSticker(userId: string, body: Record<string, unknown>) { return this.api(userId).chatSendSticker(body); }
  wuzSendTemplate(userId: string, body: Record<string, unknown>) { return this.api(userId).chatSendTemplate(body); }
  wuzSendPoll(userId: string, body: Record<string, unknown>) { return this.api(userId).chatSendPoll(body); }
  wuzSendButtons(userId: string, body: Record<string, unknown>) { return this.api(userId).chatSendButtons(body); }
  wuzSendList(userId: string, body: Record<string, unknown>) { return this.api(userId).chatSendList(body); }
  wuzRequestUnavailableMessage(userId: string, body: Record<string, unknown>) { return this.api(userId).chatRequestUnavailableMessage(body); }
  wuzGroupEphemeral(userId: string, groupJid: string, duration: string) { return this.api(userId).groupEphemeral(groupJid, duration); }
  wuzGroupPhotoRemove(userId: string, groupJid: string) { return this.api(userId).groupPhotoRemove(groupJid); }
  wuzGroupRequestParticipants(userId: string, groupJid: string) { return this.api(userId).groupRequestParticipants(groupJid); }
  wuzGroupUpdateRequestParticipants(userId: string, groupJid: string, action: string, phones: string[]) {
    return this.api(userId).groupUpdateRequestParticipants(groupJid, action, phones);
  }
  wuzGroupJoinApprovalMode(userId: string, groupJid: string, mode: boolean) {
    return this.api(userId).groupJoinApprovalMode(groupJid, mode);
  }

  async restartApp(_userId: string): Promise<any> { return unsupportedUazFeature("restartApp"); }
  async getWhatsAppLimits(_userId: string): Promise<any> { return {}; }
  async updateInstanceName(_userId: string, _name: string): Promise<any> { return { ok: true }; }
  async updateDelaySettings(_userId: string, _min: number, _max: number): Promise<any> { return { ok: true }; }
  async getProxyConfiguration(userId: string): Promise<any> {
    const body = await this.api(userId).status();
    return this.unwrap(body)?.proxy_config || {};
  }
  async updateProxyConfiguration(userId: string, enable: boolean, proxy_url?: string): Promise<any> {
    return this.api(userId).setSessionProxy({ enable, proxy_url, webhook_use_proxy: true });
  }
  async deleteProxyConfiguration(userId: string): Promise<any> {
    return this.api(userId).setSessionProxy({ enable: false, proxy_url: "" });
  }
  async updateWhatsAppProfileName(userId: string, name: string): Promise<any> {
    return this.api(userId).statusSetText(name);
  }
  async updateWhatsAppProfileImage(_userId: string, _image: string): Promise<any> {
    return unsupportedUazFeature("profileImage");
  }
  async updateAdminFields(_instanceId: string, _f1?: string, _f2?: string): Promise<boolean> { return true; }

  getProviderName(): string { return getWhatsappProviderLabel(); }
  isWuzapiActive(): boolean { return isWuzapiProvider(); }
}
