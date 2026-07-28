import { whatsappMessageRepository } from "../repositories/whatsapp_message.repository";
import { WhatsappChatRepository } from "../repositories/whatsapp_chat.repository";
import wuzapiLidResolverService from "./wuzapi/wuzapi-lid-resolver.service";
import {
  canonicalConversationSummaryKey,
  extractPreviewFromMessageRaw,
  isPlausibleWhatsappPhoneDigits,
  isValidChatJid,
  normalizeLookupJid,
  normalizePhone,
} from "./wuzapi/wuzapi-mappers";

const chatRepository = new WhatsappChatRepository();

const mergeCooldownMs = 60_000;
const lastMergeAt = new Map<string, number>();

/** Funde chats duplicados (@lid vs PN falso) e realinha mensagens no PostgreSQL. */
export class WhatsappChatMergeService {
  async mergeLidDuplicates(userId: string, force = false): Promise<{ merged: number; deleted: number }> {
    const now = Date.now();
    const last = lastMergeAt.get(userId) || 0;
    if (!force && now - last < mergeCooldownMs) {
      return { merged: 0, deleted: 0 };
    }
    lastMergeAt.set(userId, now);

    const chats = await chatRepository.listByUser(userId);
    const messages = await whatsappMessageRepository.listConversationSummaries(userId, 1000, null);

    let merged = 0;
    let deleted = 0;

    const targetByKey = new Map<string, string>();

    for (const summary of messages) {
      wuzapiLidResolverService.registerFromMessageRaw(userId, summary.chatJid, summary.raw);
      const canonical = wuzapiLidResolverService.resolveCanonicalChatJid(
        userId,
        summary.chatJid,
        summary.raw,
      );
      const key = canonicalConversationSummaryKey({ chatJid: summary.chatJid, raw: summary.raw })
        || canonical
        || summary.chatJid;
      if (!key || !isValidChatJid(canonical)) continue;
      targetByKey.set(normalizeLookupJid(summary.chatJid), canonical);
      targetByKey.set(key, canonical);
    }

    for (const chat of chats) {
      const jid = normalizeLookupJid(chat.chatJid);
      if (!jid) continue;

      const raw = chat.raw && typeof chat.raw === "object" && !Array.isArray(chat.raw)
        ? (chat.raw as Record<string, unknown>)
        : {};
      wuzapiLidResolverService.registerFromMessageRaw(userId, jid, raw);

      let target = wuzapiLidResolverService.resolveCanonicalChatJid(userId, jid, raw);
      if (!target || !isValidChatJid(target)) continue;

      const digits = normalizePhone(jid);
      const fakePn = `${digits}@s.whatsapp.net`;
      if (
        jid.endsWith("@lid")
        || (jid.endsWith("@s.whatsapp.net") && !isPlausibleWhatsappPhoneDigits(digits))
        || (fakePn !== target && jid !== target)
      ) {
        if (jid !== target) {
          targetByKey.set(jid, target);
        }
      }
    }

    for (const [fromJid, toJid] of targetByKey.entries()) {
      if (!fromJid || !toJid || fromJid === toJid) continue;
      if (!isValidChatJid(toJid)) continue;

      const moved = await whatsappMessageRepository.reassignChatJid(userId, fromJid, toJid);
      if (moved > 0) merged += moved;

      const fromChat = await chatRepository.findByChatJid(userId, fromJid);
      const toChat = await chatRepository.findByChatJid(userId, toJid);
      if (fromChat) {
        const fromTs = Number(fromChat.lastMessageTime || 0);
        const toTs = Number(toChat?.lastMessageTime || 0);
        if (!toChat || fromTs >= toTs) {
          await chatRepository.upsertLastMessageIfNewer(userId, {
            chatJid: toJid,
            sessionJid: fromChat.sessionJid || toChat?.sessionJid || null,
            name: fromChat.name || toChat?.name || undefined,
            pushName: fromChat.pushName || toChat?.pushName || undefined,
            avatarUrl: fromChat.avatarUrl || toChat?.avatarUrl || undefined,
            isGroup: fromChat.isGroup || toChat?.isGroup || false,
            lastMessage: fromChat.lastMessage || toChat?.lastMessage || undefined,
            lastMessageTime: fromChat.lastMessageTime || toChat?.lastMessageTime || null,
            unreadCount: Math.max(fromChat.unreadCount || 0, toChat?.unreadCount || 0),
            raw: {
              ...(toChat?.raw && typeof toChat.raw === "object" ? toChat.raw as object : {}),
              ...(fromChat.raw && typeof fromChat.raw === "object" ? fromChat.raw as object : {}),
              wa_chatlid: fromJid.endsWith("@lid") ? fromJid : undefined,
            },
          });
        }
        await chatRepository.deleteByChatJid(userId, fromJid);
        deleted += 1;
      }
    }

    // Remove PN falso derivado de LID (ex.: 41077838975147@s.whatsapp.net).
    for (const chat of chats) {
      const jid = normalizeLookupJid(chat.chatJid);
      if (!jid.endsWith("@s.whatsapp.net")) continue;
      if (isPlausibleWhatsappPhoneDigits(normalizePhone(jid))) continue;
      const target = targetByKey.get(jid);
      if (target && target !== jid) {
        await whatsappMessageRepository.reassignChatJid(userId, jid, target);
        await chatRepository.deleteByChatJid(userId, jid);
        deleted += 1;
      } else {
        await chatRepository.deleteByChatJid(userId, jid);
        deleted += 1;
      }
    }

    if (merged > 0 || deleted > 0) {
      console.log(`[WhatsApp] Merge LID concluído — user ${userId.slice(0, 8)}… msgs=${merged} chats=${deleted}`);
    }

    return { merged, deleted };
  }

  /** Backfill de preview vazio a partir do raw das mensagens. */
  async backfillEmptyPreviews(userId: string): Promise<number> {
    const summaries = await whatsappMessageRepository.listConversationSummaries(userId, 1000, null);
    let updated = 0;
    for (const summary of summaries) {
      const chat = await chatRepository.findByChatJid(userId, summary.chatJid);
      if (chat?.lastMessage) continue;
      const canonical = wuzapiLidResolverService.resolveCanonicalChatJid(
        userId,
        summary.chatJid,
        summary.raw,
      );
      const preview = extractPreviewFromMessageRaw(summary.raw) || "Mensagem";
      await chatRepository.upsertLastMessageIfNewer(userId, {
        chatJid: canonical || summary.chatJid,
        lastMessage: preview,
        lastMessageTime: summary.messageTimestamp,
      });
      updated += 1;
    }
    return updated;
  }
}

const whatsappChatMergeService = new WhatsappChatMergeService();
export default whatsappChatMergeService;
