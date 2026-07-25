import { WhatsappService } from "./whatsapp.service";
import { whatsappMessageRepository } from "../repositories/whatsapp_message.repository";
import { WhatsappChatRepository } from "../repositories/whatsapp_chat.repository";
import {
  collectMessageFindChatIds,
  extractUazapiMessagesFromPayload,
  extractMessageUpdateRefs,
  normalizeUazapiChatJid,
  normalizeUazapiMessageId,
  normalizeUazapiMessageTimestamp,
  resolveMessageFindChatId,
} from "../utils/uazapi-message-ingest.util";
import { isWuzapiProvider, resolveWhatsappDatastoreUserId } from "../config/whatsapp-provider.config";
import {
  extractWuzapiMessagesFromPayload,
  extractWuzapiReadReceiptRefs,
} from "../utils/wuzapi-message-ingest.util";
import whatsappSessionService from "./whatsapp-session.service";

const whatsappService = new WhatsappService();
const whatsappChatRepository = new WhatsappChatRepository();

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const HISTORY_SYNC_EVENT_TYPES = new Set([
  "history",
  "messages",
  "messages.upsert",
  "messages_update",
  "messages.update",
]);

export class WhatsappMessageService {
  private datastoreUserId(authUserId: string): string {
    return resolveWhatsappDatastoreUserId(authUserId);
  }

  private async boundSessionJid(dataUserId: string): Promise<string | null> {
    return whatsappSessionService.getBoundSessionJid(dataUserId);
  }

  private async resolveChatIdCandidates(userId: string, chatJid: string): Promise<string[]> {
    const set = new Set(collectMessageFindChatIds(chatJid));
    const chatRow = await whatsappChatRepository.findByChatJid(userId, chatJid);
    if (chatRow) {
      for (const candidate of collectMessageFindChatIds({
        ...(chatRow.raw && typeof chatRow.raw === "object" ? chatRow.raw : {}),
        chatJid: chatRow.chatJid,
        wa_chatid: chatRow.chatJid,
      })) {
        set.add(candidate);
      }
      const rowJid = String(chatRow.chatJid || "").trim().toLowerCase();
      if (rowJid) set.add(rowJid);
    }
    return Array.from(set).filter(Boolean);
  }

  private mapRawMessages(
    userId: string,
    rawMessages: Record<string, unknown>[],
    fallbackChatJid = "",
    sessionJid: string | null = null,
  ) {
    const mapped = [];
    for (const raw of rawMessages) {
      const messageId = normalizeUazapiMessageId(raw);
      const chatJid = normalizeUazapiChatJid(raw, fallbackChatJid);
      if (!messageId || !chatJid) continue;
      mapped.push({
        chatJid,
        messageId,
        messageTimestamp: normalizeUazapiMessageTimestamp(raw),
        fromMe: Boolean(raw.fromMe),
        sessionJid,
        raw,
      });
    }
    return mapped;
  }

  async fetchAndIngestMessageById(
    userId: string,
    messageId: string,
    chatJid: string,
  ): Promise<number> {
    const id = String(messageId || "").trim();
    const requestChatId = resolveMessageFindChatId(chatJid);
    if (!id || !requestChatId) return 0;

    try {
      const page = await whatsappService.findMessages(userId, { id, limit: 1 });
      const messages = Array.isArray(page?.messages)
        ? page.messages
        : (Array.isArray(page) ? page : []);
      if (!messages.length) return 0;
      return this.ingestPayload(userId, { messages }, requestChatId, { skipUpdateRefs: true });
    } catch {
      return 0;
    }
  }

  async ingestPayload(
    authUserId: string,
    payload: unknown,
    fallbackChatJid = "",
    options: { skipUpdateRefs?: boolean; sessionJid?: string | null } = {},
  ): Promise<number> {
    const userId = this.datastoreUserId(authUserId);
    const sessionJid = options.sessionJid ?? await this.boundSessionJid(userId);
    let written = 0;
    let rows = extractUazapiMessagesFromPayload(payload);
    if (!rows.length && isWuzapiProvider()) {
      rows = extractWuzapiMessagesFromPayload(payload);
    }
    if (rows.length) {
      const mapped = this.mapRawMessages(userId, rows, fallbackChatJid, sessionJid);
      written += await whatsappMessageRepository.upsertMany(userId, mapped);
    }

    if (options.skipUpdateRefs) return written;

    const refs = isWuzapiProvider()
      ? [...extractMessageUpdateRefs(payload), ...extractWuzapiReadReceiptRefs(payload)]
      : extractMessageUpdateRefs(payload);
    for (const ref of refs) {
      const chatJid = resolveMessageFindChatId(ref.chatJid || fallbackChatJid);
      if (!chatJid) continue;
      for (const messageId of ref.messageIds) {
        written += await this.fetchAndIngestMessageById(authUserId, messageId, chatJid);
      }
    }

    return written;
  }

  shouldIngestEventType(eventType: string): boolean {
    const normalized = String(eventType || "").trim().toLowerCase();
    if (!normalized) return false;
    if (HISTORY_SYNC_EVENT_TYPES.has(normalized)) return true;
    // chats.update / chat.update às vezes trazem message embutida — persistir se houver.
    if (normalized.includes("history") || normalized.includes("message")) return true;
    return normalized === "chats" || normalized.startsWith("chats.") || normalized === "chat" || normalized.startsWith("chat.");
  }

  async pullFromUazapi(
    userId: string,
    chatJid: string,
    limit = 100,
    offset = 0,
  ): Promise<number> {
    const candidates = await this.resolveChatIdCandidates(userId, chatJid);
    if (!candidates.length) return 0;

    let written = 0;
    for (const requestChatId of candidates) {
      try {
        const page = await whatsappService.findMessages(userId, {
          chatid: requestChatId,
          limit: Math.min(200, Math.max(1, limit)),
          offset: Math.max(0, offset),
        });
        const messages = Array.isArray(page?.messages)
          ? page.messages
          : (Array.isArray(page) ? page : []);
        if (!messages.length) continue;
        written += await this.ingestPayload(userId, { messages }, requestChatId, { skipUpdateRefs: true });
      } catch (error) {
        console.warn("[WhatsApp] pullFromUazapi falhou:", requestChatId, (error as Error)?.message || error);
      }
    }
    return written;
  }

  async requestHistorySync(
    userId: string,
    chatJid: string,
    count = 100,
    messageid?: string,
  ): Promise<boolean> {
    const number = resolveMessageFindChatId(chatJid);
    if (!number) return false;
    try {
      const payload: { number: string; count: number; messageid?: string } = {
        number,
        count: Math.min(100, Math.max(1, count)),
      };
      const anchor = String(messageid || "").trim();
      if (anchor) payload.messageid = anchor;
      await whatsappService.historySync(userId, payload);
      return true;
    } catch (error) {
      console.warn("[WhatsApp] history-sync falhou:", (error as Error)?.message || error);
      return false;
    }
  }

  async syncChatFromUazapi(
    userId: string,
    chatJid: string,
    options: { pullLimit?: number; historyCount?: number; anchorRounds?: number } = {},
  ): Promise<{ pulled: number; dbTotal: number; historyRequests: number }> {
    const candidates = await this.resolveChatIdCandidates(userId, chatJid);
    const primaryChatId = candidates[0] || resolveMessageFindChatId(chatJid);
    if (!primaryChatId) return { pulled: 0, dbTotal: 0, historyRequests: 0 };

    const pullLimit = Math.min(200, Math.max(1, options.pullLimit || 200));
    const historyCount = Math.min(100, Math.max(1, options.historyCount || 100));
    // Menos rounds = menos history-sync no celular (GuzzApp).
    const anchorRounds = Math.min(3, Math.max(0, options.anchorRounds ?? 2));
    let pulled = 0;
    let historyRequests = 0;

    pulled += await this.pullFromUazapi(userId, primaryChatId, pullLimit, 0);
    let dbTotal = await whatsappMessageRepository.countByChatAliases(userId, candidates);

    if (dbTotal === 0) {
      // Uma única tentativa de history-sync (não em todos os aliases).
      historyRequests += 1;
      await this.requestHistorySync(userId, primaryChatId, historyCount);
      await sleep(3500);
      pulled += await this.pullFromUazapi(userId, primaryChatId, pullLimit, 0);
      dbTotal = await whatsappMessageRepository.countByChatAliases(userId, candidates);
    }

    for (let round = 0; round < anchorRounds; round += 1) {
      const oldest = await whatsappMessageRepository.getOldestMessageByAliases(userId, candidates);
      if (!oldest?.messageId) break;

      const before = dbTotal;
      historyRequests += 1;
      await this.requestHistorySync(userId, primaryChatId, historyCount, oldest.messageId);
      await sleep(4500);
      pulled += await this.pullFromUazapi(userId, primaryChatId, pullLimit, 0);
      dbTotal = await whatsappMessageRepository.countByChatAliases(userId, candidates);
      if (dbTotal <= before) break;
    }

    return { pulled, dbTotal, historyRequests };
  }

  async listChatMessages(
    authUserId: string,
    chatJid: string,
    options: { limit?: number; offset?: number; sync?: boolean; awaitHistory?: boolean } = {},
  ) {
    const userId = this.datastoreUserId(authUserId);
    const candidates = await this.resolveChatIdCandidates(userId, chatJid);
    const requestChatId = candidates[0] || resolveMessageFindChatId(chatJid);
    if (!requestChatId) {
      throw new Error("CHAT_ID_INVALID");
    }

    const limit = Math.min(200, Math.max(1, Number(options.limit) || 50));
    const offset = Math.max(0, Number(options.offset) || 0);

    // WuzAPI: histórico vem direto da API — sem esperar DB, history-sync no celular ou Pusher.
    if (isWuzapiProvider()) {
      const page = await whatsappService.findMessages(authUserId, {
        chatid: requestChatId,
        limit,
        offset,
      });
      const messages = Array.isArray(page?.messages)
        ? page.messages
        : (Array.isArray(page) ? page : []);
      const returnedMessages = messages.length;
      return {
        messages,
        returnedMessages,
        limit,
        offset,
        nextOffset: offset + returnedMessages,
        hasMore: returnedMessages >= limit,
        total: null,
        chatJid: requestChatId,
        chatJids: candidates,
        historySyncAttempted: false,
      };
    }

    const boundSessionJid = await this.boundSessionJid(userId);
    const shouldSync = options.sync !== false;
    const awaitHistory = options.awaitHistory !== false;
    let historySyncAttempted = false;

    if (shouldSync) {
      await this.pullFromUazapi(authUserId, requestChatId, Math.max(limit, 200), offset);
    }

    // Caminho quente (abrir conversa, sync=0): evita o COUNT na tabela de mensagens.
    // hasMore é inferido buscando 1 linha a mais que o limite (probe).
    let total: number | null = null;

    if (shouldSync) {
      total = await whatsappMessageRepository.countByChatAliases(userId, candidates, boundSessionJid);

      if (awaitHistory && total === 0 && offset === 0) {
        for (const candidate of candidates) {
          historySyncAttempted = await this.requestHistorySync(authUserId, candidate, 100) || historySyncAttempted;
        }
        if (historySyncAttempted) {
          for (const delayMs of [700, 1400, 2500, 4000, 6500]) {
            await sleep(delayMs);
            await this.pullFromUazapi(authUserId, requestChatId, 200, 0);
            total = await whatsappMessageRepository.countByChatAliases(userId, candidates, boundSessionJid);
            if (total > 0) break;
          }
        }
      }
    }

    const canProbe = limit < 200;
    let rows = await whatsappMessageRepository.listByChatAliases(
      userId,
      candidates,
      canProbe ? limit + 1 : limit,
      offset,
      boundSessionJid,
    );

    let hasMore: boolean;
    if (canProbe) {
      hasMore = rows.length > limit;
      // Repo devolve em ordem ascendente: a linha extra (mais antiga) e a primeira.
      if (hasMore) rows = rows.slice(1);
    } else {
      if (total === null) total = await whatsappMessageRepository.countByChatAliases(userId, candidates, boundSessionJid);
      hasMore = offset + rows.length < total;
    }

    const messages = rows.map((row) => row.raw);
    const returnedMessages = messages.length;
    const nextOffset = offset + returnedMessages;
    if (total === null) total = nextOffset + (hasMore ? 1 : 0);

    return {
      messages,
      returnedMessages,
      limit,
      offset,
      nextOffset,
      hasMore,
      total,
      chatJid: requestChatId,
      chatJids: candidates,
      historySyncAttempted,
    };
  }
}

const whatsappMessageService = new WhatsappMessageService();
export default whatsappMessageService;
