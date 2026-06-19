import type { BellaRepository } from "../../repositories/bella.repository";
import type { BellaChatTopic } from "./topic-config";
import { truncateText } from "./memory-rules";

const CROSS_TOPIC_MAX_AGE_MS = 2 * 60 * 60 * 1000;

const LABEL_SIGNALS =
  /rótulo|rotulo|tabela nutricional|embalagem|industrializado|margarina|manteiga|produto|informação nutricional|informacao nutricional/i;

const MEAL_IMAGE_SIGNALS =
  /meu prato|foto do prato|prato montado|refeição|refeicao|di[aá]rio|almoco|almoço|jantar|lanche|café da manhã|cafe da manha/i;

const RESTAURANT_IMAGE_SIGNALS = /card[aá]pio|restaurante|rod[ií]zio|comer fora/i;

const LABEL_CONTINUATION_SIGNALS =
  /manteiga|margarina|melhor|comparar|vale a pena|alternativa|substituir|troca|ou\b|em vez de|no lugar|mesmo produto|esse produto|esse r[oó]tulo|classifica/i;

type StoredRow = {
  role: string;
  content: string;
  createdAt: Date;
  topic?: string;
  metadata?: unknown;
};

type StoredAttachmentMeta = {
  type?: string;
  url?: string;
};

export function isLabelContinuationMessage(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  return LABEL_CONTINUATION_SIGNALS.test(text) || LABEL_SIGNALS.test(text);
}

export function shouldAnalyzeImageAsLabel(topic: BellaChatTopic, message: string): boolean {
  if (topic === "label") return true;
  if (topic === "meal" || topic === "restaurant" || topic === "swap" || topic === "goal") {
    return false;
  }

  const text = message.trim();
  if (MEAL_IMAGE_SIGNALS.test(text)) return false;
  if (RESTAURANT_IMAGE_SIGNALS.test(text)) return false;
  if (LABEL_SIGNALS.test(text)) return true;

  return topic === "ask" || topic === "general";
}

export function extractImageUrlFromStoredMessages(rows: StoredRow[]): string | undefined {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    if (row.role !== "user") continue;

    const metadata = (row.metadata || {}) as Record<string, unknown>;
    const attachment = metadata.attachment as StoredAttachmentMeta | undefined;
    const url = attachment?.url;
    if (attachment?.type === "image" && typeof url === "string" && /^https?:\/\//i.test(url)) {
      return url;
    }
  }
  return undefined;
}

export async function buildCrossTopicContextBlock(
  repository: BellaRepository,
  userId: string,
  currentTopic: BellaChatTopic,
  userMessage: string,
): Promise<string> {
  if (currentTopic === "label" || !isLabelContinuationMessage(userMessage)) {
    return "";
  }

  const rows = await repository.findRecentByUser(userId, "label", 12);
  const cutoff = Date.now() - CROSS_TOPIC_MAX_AGE_MS;
  const recent = rows.filter((row) => row.createdAt.getTime() >= cutoff);
  if (!recent.length) return "";

  const lines = recent
    .filter((row) => row.role === "user" || row.role === "assistant")
    .map((row) => {
      const role = row.role === "user" ? "Paciente" : "Bella";
      return `- ${role}: ${truncateText(row.content, 420)}`;
    });

  if (!lines.length) return "";

  return (
    `## Contexto de outros chats da Bella (CONTINUIDADE OBRIGATÓRIA)\n` +
    "O paciente pode estar continuando a mesma dúvida em outro chat. Use este histórico como verdade.\n\n" +
    `### Chat "Ler rótulo" (recente)\n${lines.join("\n")}\n\n` +
    "Regras:\n" +
    "- Se a pergunta atual for continuação (ex.: margarina vs manteiga), responda com base nesse contexto.\n" +
    "- NÃO peça nova foto se a análise do rótulo já aparece acima.\n" +
    "- NÃO responda \"não posso ajudar\" para dúvidas de nutrição relacionadas ao produto."
  );
}
