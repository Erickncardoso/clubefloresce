export const BELLA_TOPICS = ["general", "label", "meal", "restaurant", "swap", "ask", "goal"] as const;
export type BellaChatTopic = (typeof BELLA_TOPICS)[number];

export function normalizeTopic(raw?: string | null): BellaChatTopic {
  const value = raw?.trim().toLowerCase();
  if (value && BELLA_TOPICS.includes(value as BellaChatTopic)) {
    return value as BellaChatTopic;
  }
  return "general";
}
