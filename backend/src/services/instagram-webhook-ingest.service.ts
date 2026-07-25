import { InstagramConfigRepository } from "../repositories/instagram-config.repository";
import { InstagramEventRepository } from "../repositories/instagram-event.repository";
import { InstagramAutomationService } from "./instagram-automation.service";

const configRepository = new InstagramConfigRepository();
const eventRepository = new InstagramEventRepository();
const automationService = new InstagramAutomationService();

/**
 * Processa o corpo (já validado por HMAC) do webhook da Meta.
 * Formato: { object: "instagram", entry: [{ id, changes?: [...], messaging?: [...] }] }
 */
export class InstagramWebhookIngestService {
  async ingest(body: any): Promise<void> {
    if (body?.object !== "instagram" || !Array.isArray(body.entry)) return;

    for (const entry of body.entry) {
      const igAccountId = String(entry.id ?? "");
      const config =
        (igAccountId ? await configRepository.findByInstagramUserId(igAccountId) : null) ??
        (await configRepository.findFirst());

      // changes[] → comentários
      for (const change of entry.changes ?? []) {
        await eventRepository.create({
          userId: config?.userId ?? null,
          field: change.field ?? "changes",
          payload: change,
        });
        if (!config) continue;

        if (change.field === "comments") {
          const value = change.value ?? {};
          try {
            await automationService.handleComment(config, {
              commentId: String(value.id ?? ""),
              text: String(value.text ?? ""),
              mediaId: value.media?.id ? String(value.media.id) : undefined,
              fromId: value.from?.id ? String(value.from.id) : undefined,
              fromUsername: value.from?.username,
            });
          } catch (error) {
            console.error("[Instagram] Erro ao processar comentário:", error);
          }
        }
      }

      // messaging[] → DMs, respostas de story e quick replies
      for (const messaging of entry.messaging ?? []) {
        await eventRepository.create({
          userId: config?.userId ?? null,
          field: "messages",
          payload: messaging,
        });
        if (!config) continue;

        const message = messaging.message;
        if (!message) continue; // read/postback/etc. ficam só no log

        try {
          await automationService.handleMessage(config, {
            senderId: String(messaging.sender?.id ?? ""),
            text: message.text ? String(message.text) : undefined,
            quickReplyPayload: message.quick_reply?.payload
              ? String(message.quick_reply.payload)
              : undefined,
            isStoryReply: Boolean(message.reply_to?.story),
            isEcho: Boolean(message.is_echo),
          });
        } catch (error) {
          console.error("[Instagram] Erro ao processar mensagem:", error);
        }
      }
    }
  }
}
