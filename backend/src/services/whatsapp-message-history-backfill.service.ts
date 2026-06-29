import { WhatsappService } from "./whatsapp.service";
import whatsappMessageService from "./whatsapp-message.service";
import { whatsappMessageRepository } from "../repositories/whatsapp_message.repository";
import {
  collectMessageFindChatIds,
  resolveMessageFindChatId,
} from "../utils/uazapi-message-ingest.util";
import { extractUazapiWebhookChatJid } from "../utils/uazapi-webhook-event.util";

const whatsappService = new WhatsappService();

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const BACKFILL_ENABLED = String(process.env.WHATSAPP_HISTORY_BACKFILL_ENABLED || "1") !== "0";
const CONNECT_GRACE_MS = Number(process.env.WHATSAPP_HISTORY_BACKFILL_GRACE_MS || 4 * 60 * 1000);
const CHAT_DELAY_MS = Number(process.env.WHATSAPP_HISTORY_BACKFILL_CHAT_DELAY_MS || 2500);
const MAX_CHATS_PER_RUN = Number(process.env.WHATSAPP_HISTORY_BACKFILL_MAX_CHATS || 100);
const BACKFILL_COOLDOWN_MS = Number(process.env.WHATSAPP_HISTORY_BACKFILL_COOLDOWN_MS || 30 * 60 * 1000);
const POLL_AFTER_BATCH_MS = [3000, 6000, 12000, 20000, 35000];

type UazChatRow = Record<string, unknown>;

type BackfillStats = {
  startedAt: string;
  finishedAt?: string;
  chatsScanned: number;
  chatsSynced: number;
  chatsSkipped: number;
  messagesPulled: number;
  historyRequests: number;
  errors: number;
};

type UserBackfillState = {
  running: boolean;
  scheduledTimer?: ReturnType<typeof setTimeout>;
  lastCompletedAt?: number;
  lastStats?: BackfillStats;
};

const userStates = new Map<string, UserBackfillState>();

const getState = (userId: string): UserBackfillState => {
  let state = userStates.get(userId);
  if (!state) {
    state = { running: false };
    userStates.set(userId, state);
  }
  return state;
};

const resolveChatJid = (chat: UazChatRow): string => {
  const ids = collectMessageFindChatIds(chat);
  return ids[0] || "";
};

const resolveChatAliases = (chat: UazChatRow): string[] => collectMessageFindChatIds(chat);

const chatHasPreview = (chat: UazChatRow): boolean => {
  const ts = Number(chat.wa_lastMsgTimestamp || chat.lastMessageTime || 0);
  const text = String(
    chat.wa_lastMessageTextVote
    || chat.wa_lastMsgText
    || chat.lastMessage
    || "",
  ).trim();
  return ts > 0 || text.length > 0;
};

const isConnectionEstablished = (payload: unknown): boolean => {
  if (!payload || typeof payload !== "object") return false;
  const body = payload as Record<string, unknown>;
  const type = String(body.type || body.event || body.EventType || "").trim().toLowerCase();
  if (type !== "connection") return false;
  const message = String(body.message || body.status || "").trim().toLowerCase();
  if (!message) return true;
  return (
    message.includes("established")
    || message.includes("connected")
    || message.includes("open")
    || message.includes("online")
  );
};

async function fetchAllRemoteChats(userId: string): Promise<UazChatRow[]> {
  const pageSize = 300;
  const maxPages = 25;
  const byJid = new Map<string, UazChatRow>();
  let offset = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const pageResult = await whatsappService.findChats(userId, {
      operator: "AND",
      sort: "-wa_lastMsgTimestamp",
      limit: pageSize,
      offset,
    });
    const chats = Array.isArray(pageResult?.chats) ? pageResult.chats : [];
    if (!chats.length) break;

    for (const chat of chats) {
      const jid = resolveChatJid(chat);
      if (!jid) continue;
      byJid.set(jid, chat);
    }

    offset += chats.length;
    const total = Number(pageResult?.pagination?.totalRecords || 0);
    if (total > 0 && offset >= total) break;
    if (chats.length < pageSize) break;
  }

  return Array.from(byJid.values());
}

async function prioritizeChats(userId: string, chats: UazChatRow[]): Promise<string[]> {
  const scored: Array<{ jid: string; score: number; ts: number }> = [];

  for (const chat of chats) {
    const jid = resolveChatJid(chat);
    if (!jid) continue;
    if (!chatHasPreview(chat)) continue;

    const aliases = resolveChatAliases(chat);
    const dbCount = await whatsappMessageRepository.countByChatAliases(userId, aliases);
    const ts = Number(chat.wa_lastMsgTimestamp || 0);
    const score = dbCount === 0 ? 1000 : dbCount < 20 ? 500 : 100;
    scored.push({ jid, score, ts });
  }

  scored.sort((a, b) => (b.score - a.score) || (b.ts - a.ts));
  return scored.slice(0, MAX_CHATS_PER_RUN).map((row) => row.jid);
}

async function pollPendingChats(userId: string, chatJids: string[]): Promise<number> {
  let pulled = 0;
  for (const delayMs of POLL_AFTER_BATCH_MS) {
    await sleep(delayMs);
    for (const chatJid of chatJids) {
      try {
        pulled += await whatsappMessageService.pullFromUazapi(userId, chatJid, 200, 0);
      } catch {
        /* continua */
      }
    }
  }
  return pulled;
}

export class WhatsappMessageHistoryBackfillService {
  getStatus(userId: string) {
    const state = getState(userId);
    return {
      enabled: BACKFILL_ENABLED,
      running: state.running,
      lastCompletedAt: state.lastCompletedAt ? new Date(state.lastCompletedAt).toISOString() : null,
      lastStats: state.lastStats || null,
      totalMessagesInDb: null as number | null,
    };
  }

  async getStatusWithCounts(userId: string) {
    const status = this.getStatus(userId);
    status.totalMessagesInDb = await whatsappMessageRepository.countByUser(userId);
    return status;
  }

  scheduleOnConnect(userId: string, reason = "connection"): void {
    if (!BACKFILL_ENABLED || !userId) return;

    const state = getState(userId);
    if (state.running || state.scheduledTimer) return;

    console.log(
      `[WhatsApp Backfill] Agendado para ${userId.slice(0, 8)}… em ${Math.round(CONNECT_GRACE_MS / 1000)}s (${reason})`,
    );

    state.scheduledTimer = setTimeout(() => {
      state.scheduledTimer = undefined;
      void this.runBackfill(userId, { reason: `scheduled:${reason}` });
    }, CONNECT_GRACE_MS);
  }

  noteHistoryWebhook(userId: string, payload: unknown): void {
    if (!BACKFILL_ENABLED || !userId) return;

    const chatJid = extractUazapiWebhookChatJid(payload);
    if (!chatJid) return;

    void whatsappMessageService.pullFromUazapi(userId, chatJid, 200, 0).catch(() => {});
  }

  handleWebhook(userId: string | null, payload: unknown, eventType: string): void {
    if (!userId || !BACKFILL_ENABLED) return;

    if (isConnectionEstablished(payload)) {
      this.scheduleOnConnect(userId, "webhook-connection");
      return;
    }

    if (eventType === "history" || eventType.includes("history")) {
      this.noteHistoryWebhook(userId, payload);
    }
  }

  async runBackfill(
    userId: string,
    options: { force?: boolean; reason?: string; chatJids?: string[] } = {},
  ): Promise<BackfillStats> {
    const state = getState(userId);
    if (state.running) {
      return state.lastStats || {
        startedAt: new Date().toISOString(),
        chatsScanned: 0,
        chatsSynced: 0,
        chatsSkipped: 0,
        messagesPulled: 0,
        historyRequests: 0,
        errors: 0,
      };
    }

    if (
      !options.force
      && state.lastCompletedAt
      && Date.now() - state.lastCompletedAt < BACKFILL_COOLDOWN_MS
    ) {
      console.log(`[WhatsApp Backfill] Cooldown ativo para ${userId.slice(0, 8)}…`);
      return state.lastStats!;
    }

    state.running = true;
    const stats: BackfillStats = {
      startedAt: new Date().toISOString(),
      chatsScanned: 0,
      chatsSynced: 0,
      chatsSkipped: 0,
      messagesPulled: 0,
      historyRequests: 0,
      errors: 0,
    };

    console.log(`[WhatsApp Backfill] Iniciando (${userId.slice(0, 8)}…) reason=${options.reason || "manual"}`);

    try {
      const token = await whatsappService.getInstanceToken(userId);
      if (!token) {
        console.warn("[WhatsApp Backfill] Instância não conectada — abortando.");
        return stats;
      }

      let targetJids = options.chatJids?.map((jid) => resolveMessageFindChatId(jid)).filter(Boolean) as string[];

      if (!targetJids?.length) {
        const remoteChats = await fetchAllRemoteChats(userId);
        stats.chatsScanned = remoteChats.length;
        targetJids = await prioritizeChats(userId, remoteChats);
      } else {
        stats.chatsScanned = targetJids.length;
      }

      if (!targetJids.length) {
        console.log("[WhatsApp Backfill] Nenhum chat elegível.");
        return stats;
      }

      const syncedJids: string[] = [];

      for (const chatJid of targetJids) {
        try {
          const before = await whatsappMessageRepository.countByChat(userId, chatJid);
          const result = await whatsappMessageService.syncChatFromUazapi(userId, chatJid, {
            anchorRounds: before === 0 ? 10 : 4,
          });
          stats.messagesPulled += result.pulled;
          stats.historyRequests += result.historyRequests;

          if (result.dbTotal > before) {
            stats.chatsSynced += 1;
            syncedJids.push(chatJid);
          } else if (before === 0 && result.dbTotal === 0) {
            stats.chatsSkipped += 1;
          }

          await sleep(CHAT_DELAY_MS);
        } catch (error) {
          stats.errors += 1;
          console.warn(
            `[WhatsApp Backfill] Falha em ${chatJid}:`,
            (error as Error)?.message || error,
          );
        }
      }

      if (syncedJids.length) {
        stats.messagesPulled += await pollPendingChats(userId, syncedJids);
      }

      stats.finishedAt = new Date().toISOString();
      state.lastCompletedAt = Date.now();
      state.lastStats = stats;

      console.log(
        `[WhatsApp Backfill] Concluído (${userId.slice(0, 8)}…): `
        + `${stats.chatsSynced}/${targetJids.length} chats, `
        + `${stats.messagesPulled} msgs puxadas, `
        + `${stats.historyRequests} history-sync`,
      );

      return stats;
    } finally {
      state.running = false;
    }
  }
}

const whatsappMessageHistoryBackfillService = new WhatsappMessageHistoryBackfillService();
export default whatsappMessageHistoryBackfillService;
