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
    }
    return Array.from(set);
  }

  private mapRawMessages(userId: string, rawMessages: Record<string, unknown>[], fallbackChatJid = "") {
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
    userId: string,
    payload: unknown,
    fallbackChatJid = "",
    options: { skipUpdateRefs?: boolean } = {},
  ): Promise<number> {
    let written = 0;
    const rows = extractUazapiMessagesFromPayload(payload);
    if (rows.length) {
      const mapped = this.mapRawMessages(userId, rows, fallbackChatJid);
      written += await whatsappMessageRepository.upsertMany(userId, mapped);
    }

    if (options.skipUpdateRefs) return written;

    const refs = extractMessageUpdateRefs(payload);
    for (const ref of refs) {
      const chatJid = resolveMessageFindChatId(ref.chatJid || fallbackChatJid);
      if (!chatJid) continue;
      for (const messageId of ref.messageIds) {
        written += await this.fetchAndIngestMessageById(userId, messageId, chatJid);
      }
    }

    return written;
  }

  shouldIngestEventType(eventType: string): boolean {
    const normalized = String(eventType || "").trim().toLowerCase();
    if (!normalized) return false;
    if (HISTORY_SYNC_EVENT_TYPES.has(normalized)) return true;
    return normalized.includes("history") || normalized.includes("message");
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
    const anchorRounds = Math.min(15, Math.max(0, options.anchorRounds ?? 8));
    let pulled = 0;
    let historyRequests = 0;

    pulled += await this.pullFromUazapi(userId, primaryChatId, pullLimit, 0);
    let dbTotal = await whatsappMessageRepository.countByChatAliases(userId, candidates);

    if (dbTotal === 0) {
      for (const requestChatId of candidates) {
        historyRequests += 1;
        await this.requestHistorySync(userId, requestChatId, historyCount);
      }
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
    userId: string,
    chatJid: string,
    options: { limit?: number; offset?: number; sync?: boolean; awaitHistory?: boolean } = {},
  ) {
    const candidates = await this.resolveChatIdCandidates(userId, chatJid);
    const requestChatId = candidates[0] || resolveMessageFindChatId(chatJid);
    if (!requestChatId) {
      throw new Error("CHAT_ID_INVALID");
    }

    const limit = Math.min(200, Math.max(1, Number(options.limit) || 50));
    const offset = Math.max(0, Number(options.offset) || 0);
    const shouldSync = options.sync !== false;
    const awaitHistory = options.awaitHistory !== false;
    let historySyncAttempted = false;

    if (shouldSync) {
      await this.pullFromUazapi(userId, requestChatId, Math.max(limit, 200), offset);
    }

    let total = await whatsappMessageRepository.countByChatAliases(userId, candidates);

    if (shouldSync && awaitHistory && total === 0 && offset === 0) {
      for (const candidate of candidates) {
        historySyncAttempted = await this.requestHistorySync(userId, candidate, 100) || historySyncAttempted;
      }
      if (historySyncAttempted) {
        for (const delayMs of [700, 1400, 2500, 4000, 6500]) {
          await sleep(delayMs);
          await this.pullFromUazapi(userId, requestChatId, 200, 0);
          total = await whatsappMessageRepository.countByChatAliases(userId, candidates);
          if (total > 0) break;
        }
      }
    }

    const rows = await whatsappMessageRepository.listByChatAliases(userId, candidates, limit, offset);
    const messages = rows.map((row) => row.raw);
    const returnedMessages = messages.length;
    const nextOffset = offset + returnedMessages;
    const hasMore = nextOffset < total;

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
