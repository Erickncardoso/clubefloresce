import dotenv from "dotenv";
import { prisma } from "../lib/prisma";
import { WhatsappService } from "../services/whatsapp.service";
import whatsappMediaArchiveService from "../services/whatsapp-media-archive.service";
import { isBackblazeB2Configured } from "../utils/media/backblaze-config";

dotenv.config();

const whatsappService = new WhatsappService();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeMessageId = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.includes(":") ? (raw.split(":").pop() || raw) : raw;
};

const resolveMessageFindChatId = (chatJid: string): string => {
  const normalized = String(chatJid || "").trim();
  if (!normalized) return "";
  if (normalized.endsWith("@lid")) {
    const digits = (normalized.split("@")[0] || "").replace(/\D/g, "");
    return digits.length >= 10 ? `${digits}@s.whatsapp.net` : "";
  }
  return normalized;
};

const isMediaMessage = (msg: any): boolean => {
  const type = String(msg?.messageType || msg?.type || "").toLowerCase();
  const content = msg?.content || msg?.message || {};
  if (
    type.includes("image")
    || type.includes("video")
    || type.includes("sticker")
    || type.includes("document")
    || type.includes("audio")
    || type.includes("ptt")
  ) {
    return true;
  }
  return Boolean(
    content?.imageMessage
    || content?.videoMessage
    || content?.stickerMessage
    || content?.documentMessage
    || content?.audioMessage
    || content?.ephemeralMessage?.message?.imageMessage
    || content?.viewOnceMessage?.message?.imageMessage
    || content?.viewOnceMessageV2?.message?.imageMessage,
  );
};

async function resolveUserId(): Promise<string> {
  const explicit = String(process.env.WHATSAPP_BACKFILL_USER_ID || "").trim();
  if (explicit) return explicit;

  const nutri = await prisma.user.findFirst({
    where: { role: "NUTRICIONISTA" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (nutri) {
    console.log(`Usuário: ${nutri.email} (${nutri.id})`);
    return nutri.id;
  }

  const chat = await prisma.whatsappChat.findFirst({ select: { userId: true } });
  if (chat?.userId) return chat.userId;

  throw new Error("Nenhum usuário encontrado para backfill.");
}

async function fetchChatMessages(userId: string, chatJid: string, maxMessages: number): Promise<any[]> {
  const requestChatId = resolveMessageFindChatId(chatJid);
  if (!requestChatId) return [];

  const collected: any[] = [];
  let offset = 0;
  const pageSize = 100;

  while (collected.length < maxMessages) {
    const page = await whatsappService.findMessages(userId, {
      chatid: requestChatId,
      limit: pageSize,
      offset,
    });
    const messages = Array.isArray(page?.messages) ? page.messages : (Array.isArray(page) ? page : []);
    if (messages.length === 0) break;
    collected.push(...messages);
    if (!page?.hasMore || messages.length < pageSize) break;
    offset += messages.length;
  }

  return collected.slice(0, maxMessages);
}

async function main() {
  if (!isBackblazeB2Configured() || !whatsappMediaArchiveService.isEnabled()) {
    throw new Error("Backblaze B2 não está configurado.");
  }

  const userId = await resolveUserId();
  const token = await whatsappService.getInstanceToken(userId);
  if (!token) {
    throw new Error("WhatsApp não conectado para este usuário.");
  }

  const maxChats = Number(process.env.WHATSAPP_BACKFILL_MAX_CHATS || 60);
  const maxPerChat = Number(process.env.WHATSAPP_BACKFILL_MAX_MESSAGES_PER_CHAT || 200);
  const delayMs = Number(process.env.WHATSAPP_BACKFILL_DELAY_MS || 350);

  const chatsResult = await whatsappService.findChats(userId, {
    operator: "AND",
    sort: "-wa_lastMsgTimestamp",
    limit: maxChats,
    offset: 0,
  });
  const chats = Array.isArray(chatsResult?.chats) ? chatsResult.chats : [];
  console.log(`Chats a varrer: ${chats.length}`);

  let archived = 0;
  let skipped = 0;
  let failed = 0;
  let scanned = 0;

  for (const chat of chats) {
    const chatJid = String(chat?.wa_chatid || chat?.chatid || chat?.id || "").trim();
    if (!chatJid) continue;

    const chatName = String(chat?.wa_contactName || chat?.wa_name || chat?.name || chatJid).trim();
    let messages: any[] = [];
    try {
      messages = await fetchChatMessages(userId, chatJid, maxPerChat);
    } catch (error: any) {
      console.warn(`[${chatName}] falha ao listar mensagens:`, error?.message || error);
      continue;
    }

    const mediaMessages = messages.filter(isMediaMessage);
    if (mediaMessages.length === 0) continue;

    console.log(`[${chatName}] ${mediaMessages.length} mídia(s)`);

    for (const msg of mediaMessages) {
      scanned += 1;
      const messageId = normalizeMessageId(msg?.messageid || msg?.id);
      if (!messageId) continue;

      const cached = await whatsappMediaArchiveService.findCachedPublicUrl(userId, messageId);
      if (cached) {
        skipped += 1;
        continue;
      }

      try {
        const download = await whatsappService.downloadMedia(userId, {
          id: messageId,
          chatid: resolveMessageFindChatId(chatJid) || chatJid,
          return_link: true,
          return_base64: false,
        });
        const remoteUrl = String(download?.fileURL || download?.fileUrl || download?.url || "").trim();
        if (!remoteUrl) {
          failed += 1;
          console.warn(`  falha ${messageId.slice(0, 12)}…: sem URL`);
          continue;
        }

        const mimeType = String(
          download?.mimetype
          || download?.mimeType
          || msg?.content?.imageMessage?.mimetype
          || msg?.content?.videoMessage?.mimetype
          || "",
        ).trim() || undefined;

        await whatsappMediaArchiveService.archiveFromRemoteUrl(userId, messageId, remoteUrl, {
          chatJid,
          mimeType,
        });
        archived += 1;
        console.log(`  arquivado ${messageId.slice(0, 12)}…`);
        await sleep(delayMs);
      } catch (error: any) {
        failed += 1;
        console.warn(`  falha ${messageId.slice(0, 12)}…:`, error?.message || error);
      }
    }
  }

  const total = await prisma.whatsappMediaArchive.count({ where: { userId } });
  console.log("\nBackfill concluído.");
  console.log(`Mídias analisadas: ${scanned}`);
  console.log(`Arquivadas agora: ${archived}`);
  console.log(`Já existiam: ${skipped}`);
  console.log(`Falhas: ${failed}`);
  console.log(`Total no banco: ${total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
