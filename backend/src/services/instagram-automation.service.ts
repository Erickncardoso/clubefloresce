import type { InstagramConfig } from "@prisma/client";
import {
  InstagramAutomationRepository,
  type AutomationWithFollowups,
} from "../repositories/instagram-automation.repository";
import { InstagramContactRepository } from "../repositories/instagram-contact.repository";
import { InstagramQueueRepository } from "../repositories/instagram-queue.repository";

const automationRepository = new InstagramAutomationRepository();
const contactRepository = new InstagramContactRepository();
const queueRepository = new InstagramQueueRepository();

const QUICK_REPLY_PREFIX = "automation:";

function normalize(text: string): string {
  // Remove acentos para casar "AÇÃO" com "acao".
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function keywordMatches(automation: AutomationWithFollowups, text: string): boolean {
  const keywords = (automation.keywords as string[] | null) ?? [];
  if (!keywords.length) return false;
  const normalized = normalize(text);
  return keywords.some((keyword) => {
    const kw = normalize(String(keyword));
    if (!kw) return false;
    return automation.matchType === "EXACT" ? normalized === kw : normalized.includes(kw);
  });
}

function pickRandom<T>(items: T[]): T | null {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Casa eventos do webhook com automações ativas e enfileira as respostas.
 * Nunca envia nada direto — só grava na fila; quem envia é o worker.
 */
export class InstagramAutomationService {
  /** Comentário em post/reels → resposta privada (+ reply público opcional). */
  async handleComment(
    config: InstagramConfig,
    comment: {
      commentId: string;
      text: string;
      mediaId?: string;
      fromId?: string;
      fromUsername?: string;
    }
  ): Promise<void> {
    // Nunca reagir aos próprios comentários (inclusive os replies públicos do robô).
    if (!comment.fromId || comment.fromId === config.instagramUserId) return;
    if (!comment.text) return;

    const automations = await automationRepository.listActiveByUser(config.userId);
    const match = automations.find(
      (automation) =>
        automation.triggerComment &&
        (!automation.targetMediaId || automation.targetMediaId === comment.mediaId) &&
        keywordMatches(automation, comment.text)
    );
    if (!match) return;

    const alreadyQueued = await queueRepository.existsForComment(comment.commentId, "PRIVATE_REPLY");
    if (alreadyQueued) return;

    await contactRepository.upsert({
      userId: config.userId,
      instagramScopedId: comment.fromId,
      username: comment.fromUsername,
      lastAutomationId: match.id,
    });

    await queueRepository.enqueue({
      userId: config.userId,
      automationId: match.id,
      kind: "PRIVATE_REPLY",
      commentId: comment.commentId,
      payload: {
        text: match.welcomeMessage,
        quickReply: { title: match.quickReplyLabel, payload: `${QUICK_REPLY_PREFIX}${match.id}` },
      },
    });

    const publicReply = pickRandom((match.publicReplyVariations as string[] | null) ?? []);
    if (publicReply) {
      await queueRepository.enqueue({
        userId: config.userId,
        automationId: match.id,
        kind: "PUBLIC_REPLY",
        commentId: comment.commentId,
        payload: { text: publicReply },
      });
    }
  }

  /** Mensagem recebida na DM (inclui resposta de story e quick reply). */
  async handleMessage(
    config: InstagramConfig,
    message: {
      senderId: string;
      text?: string;
      quickReplyPayload?: string;
      isStoryReply: boolean;
      isEcho: boolean;
    }
  ): Promise<void> {
    if (message.isEcho || message.senderId === config.instagramUserId) return;

    // 1) Quick reply "Quero o link!" → dispara link + lembrete + follow-ups extras.
    if (message.quickReplyPayload?.startsWith(QUICK_REPLY_PREFIX)) {
      const automationId = message.quickReplyPayload.slice(QUICK_REPLY_PREFIX.length);
      const automation = await automationRepository.findById(automationId, config.userId);
      await contactRepository.markReplied(message.senderId, automationId);
      if (automation) {
        await this.enqueueFollowups(config, automation, message.senderId);
      }
      return;
    }

    if (!message.text) return;

    // 2) Palavra-chave em story ou DM → DM de boas-vindas.
    const automations = await automationRepository.listActiveByUser(config.userId);
    const match = automations.find((automation) => {
      const triggerOk = message.isStoryReply ? automation.triggerStory : automation.triggerDm;
      return triggerOk && keywordMatches(automation, message.text!);
    });
    if (!match) return;

    await contactRepository.upsert({
      userId: config.userId,
      instagramScopedId: message.senderId,
      lastAutomationId: match.id,
    });

    await queueRepository.enqueue({
      userId: config.userId,
      automationId: match.id,
      kind: "WELCOME_DM",
      recipientId: message.senderId,
      payload: {
        text: match.welcomeMessage,
        quickReply: { title: match.quickReplyLabel, payload: `${QUICK_REPLY_PREFIX}${match.id}` },
      },
    });
  }

  private async enqueueFollowups(
    config: InstagramConfig,
    automation: AutomationWithFollowups,
    recipientId: string
  ): Promise<void> {
    // Link principal — imediato.
    if (automation.linkUrl) {
      await queueRepository.enqueue({
        userId: config.userId,
        automationId: automation.id,
        kind: "FOLLOWUP",
        recipientId,
        payload: {
          text: automation.linkText || "Aqui está o seu link! 👇",
          buttonLabel: automation.linkButtonLabel || "Acessar",
          url: automation.linkUrl,
        },
      });
    }

    // Lembrete por tempo (não rastreamos clique — limite real da API).
    if (automation.reminderText) {
      await queueRepository.enqueue({
        userId: config.userId,
        automationId: automation.id,
        kind: "FOLLOWUP",
        recipientId,
        payload: {
          text: automation.reminderText,
          ...(automation.linkUrl
            ? { buttonLabel: automation.linkButtonLabel || "Acessar", url: automation.linkUrl }
            : {}),
        },
        scheduledFor: new Date(Date.now() + automation.reminderDelayMinutes * 60_000),
      });
    }

    // Sequência extra configurada na automação.
    for (const followup of automation.followups) {
      await queueRepository.enqueue({
        userId: config.userId,
        automationId: automation.id,
        kind: "FOLLOWUP",
        recipientId,
        payload: {
          text: followup.body,
          ...(followup.url
            ? { buttonLabel: followup.buttonLabel || "Acessar", url: followup.url }
            : {}),
        },
        scheduledFor: new Date(Date.now() + followup.delayMinutes * 60_000),
      });
    }
  }
}
