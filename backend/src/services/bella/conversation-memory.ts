import type { ChatMessage } from "./types";
import type { BellaChatTopic } from "./topic-config";
import { truncateText } from "./memory-rules";

function flattenContent(content: ChatMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ");
}

/**
 * Resume mensagens recentes do MESMO tópico para continuidade sem perder contexto.
 */
export function buildConversationMemoryBlock(
  topic: BellaChatTopic,
  priorHistory: ChatMessage[],
  maxMessages = 10,
): string {
  if (!priorHistory.length) {
    return `## Memória desta conversa (${topic})\nPrimeira interação neste chat.`;
  }

  const recent = priorHistory.slice(-maxMessages);
  const lines = recent.map((message) => {
    const role = message.role === "user" ? "Paciente" : "Bella";
    const text = truncateText(flattenContent(message.content), 320);
    return `- ${role}: ${text}`;
  });

  return (
    `## Memória desta conversa (${topic})\n` +
    "Use para manter continuidade. Se houver conflito com a memória verificada do banco, o banco prevalece.\n\n" +
    lines.join("\n")
  );
}

export function prepareHistoryForModel(
  priorHistory: ChatMessage[],
  maxMessages: number,
): ChatMessage[] {
  return priorHistory.slice(-maxMessages).map((message) => ({
    ...message,
    content:
      typeof message.content === "string"
        ? truncateText(message.content, 2000)
        : message.content,
  }));
}
