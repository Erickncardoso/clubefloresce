import os from "os";
import { InstagramConfigRepository } from "../repositories/instagram-config.repository";
import { InstagramQueueRepository } from "../repositories/instagram-queue.repository";
import {
  sendDirectMessage,
  sendLinkButtonMessage,
  sendPrivateReplyToComment,
  replyToCommentPublicly,
  InstagramGraphError,
} from "../utils/instagram-graph.client";
import type { InstagramConfig, InstagramQueueItem } from "@prisma/client";

const configRepository = new InstagramConfigRepository();
const queueRepository = new InstagramQueueRepository();

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 30; // por drain — bem abaixo de ~200 DMs/h
const GAP_BETWEEN_SENDS_MS = 600; // ~1,6 msg/s

let draining = false;

/** Drena a fila: trava lote com SKIP LOCKED e envia em série (respeita rate limit). */
export async function drainInstagramQueue(): Promise<void> {
  if (draining) return; // drains simultâneos no MESMO processo não fazem sentido
  draining = true;
  try {
    await queueRepository.releaseStuck();

    const claimedBy = `${os.hostname()}:${process.pid}`;
    const items = await queueRepository.claimBatch(claimedBy, BATCH_SIZE);
    if (!items.length) return;

    const configCache = new Map<string, InstagramConfig | null>();

    for (const item of items) {
      let config = configCache.get(item.userId);
      if (config === undefined) {
        config = await configRepository.findByUserId(item.userId);
        configCache.set(item.userId, config);
      }

      if (!config) {
        await queueRepository.markSkipped(item.id, "Conta Instagram desconectada.");
        continue;
      }

      try {
        await sendQueueItem(config, item);
        await queueRepository.markSent(item.id);
      } catch (error) {
        const attempts = item.attempts + 1;
        const message =
          error instanceof InstagramGraphError
            ? `${error.status}: ${error.message}`
            : String((error as Error)?.message ?? error);
        // 4xx (exceto 429) não vale retry — o pedido nunca vai passar.
        const permanent =
          error instanceof InstagramGraphError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 429;
        await queueRepository.markFailed(
          item.id,
          message,
          permanent ? MAX_ATTEMPTS : attempts,
          MAX_ATTEMPTS
        );
        console.error(`[Instagram] Falha ao enviar item ${item.id} (${item.kind}):`, message);
      }

      await new Promise((resolve) => setTimeout(resolve, GAP_BETWEEN_SENDS_MS));
    }
  } finally {
    draining = false;
  }
}

async function sendQueueItem(config: InstagramConfig, item: InstagramQueueItem): Promise<void> {
  const payload = (item.payload ?? {}) as {
    text?: string;
    quickReply?: { title: string; payload: string };
    buttonLabel?: string;
    url?: string;
  };
  const text = payload.text ?? "";

  switch (item.kind) {
    case "PRIVATE_REPLY": {
      if (!item.commentId) throw new Error("PRIVATE_REPLY sem commentId.");
      await sendPrivateReplyToComment(
        config.instagramUserId,
        config.accessToken,
        item.commentId,
        text,
        payload.quickReply ? [payload.quickReply] : undefined
      );
      return;
    }
    case "PUBLIC_REPLY": {
      if (!item.commentId) throw new Error("PUBLIC_REPLY sem commentId.");
      await replyToCommentPublicly(item.commentId, config.accessToken, text);
      return;
    }
    case "WELCOME_DM":
    case "FOLLOWUP": {
      if (!item.recipientId) throw new Error(`${item.kind} sem recipientId.`);
      if (payload.url && payload.buttonLabel) {
        await sendLinkButtonMessage(
          config.instagramUserId,
          config.accessToken,
          item.recipientId,
          text,
          payload.buttonLabel,
          payload.url
        );
        return;
      }
      await sendDirectMessage(
        config.instagramUserId,
        config.accessToken,
        item.recipientId,
        text,
        payload.quickReply ? [payload.quickReply] : undefined
      );
      return;
    }
  }
}
