export type BellaTaskType = "chat" | "image" | "pdf";

export interface BellaModelsConfig {
  chat: string;
  image: string;
  pdf: string;
}

const DEFAULT_CHAT = "gpt-4o-mini";
const DEFAULT_VISION = "gpt-4o";

export function getBellaModels(): BellaModelsConfig {
  const legacy = process.env.OPENAI_MODEL?.trim();
  return {
    chat: process.env.OPENAI_MODEL_CHAT?.trim() || legacy || DEFAULT_CHAT,
    image: process.env.OPENAI_MODEL_VISION?.trim() || DEFAULT_VISION,
    pdf: process.env.OPENAI_MODEL_PDF?.trim() || process.env.OPENAI_MODEL_VISION?.trim() || DEFAULT_VISION,
  };
}

export function getModelForTask(task: BellaTaskType): string {
  const models = getBellaModels();
  if (task === "image") return models.image;
  if (task === "pdf") return models.pdf;
  return models.chat;
}

export function resolveTaskType(input: {
  topic?: string;
  message?: string;
  mimeType?: string;
  taskHint?: string;
  hasFile?: boolean;
}): BellaTaskType {
  const topic = input.topic?.trim().toLowerCase();
  const hint = input.taskHint?.trim().toLowerCase();
  if (hint === "image" || hint === "label" || hint === "rotulo") {
    if (input.hasFile && input.mimeType?.startsWith("image/")) return "image";
    if (!input.hasFile) return "chat";
  }
  if (hint === "meal" || hint === "prato" || hint === "plate") {
    if (input.hasFile && input.mimeType?.startsWith("image/")) return "image";
    if (!input.hasFile) return "chat";
  }
  if (topic === "label" && input.hasFile && input.mimeType?.startsWith("image/")) return "image";
  if (topic === "meal" && input.hasFile && input.mimeType?.startsWith("image/")) return "image";
  if (hint === "pdf" || hint === "document") return "pdf";
  if (hint === "chat") return "chat";

  const mime = input.mimeType?.toLowerCase() || "";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";

  const text = (input.message || "").toLowerCase();
  if (/pdf|documento|plano alimentar|receita médica/.test(text) && input.hasFile) return "pdf";
  if (/rótulo|rotulo|foto|imagem|tabela nutricional/.test(text) && input.hasFile) return "image";
  if (/prato|refeição|refeicao|almoco|almoço|jantar|lanche|café da manhã|calorias do prato/.test(text) && input.hasFile) return "image";

  return "chat";
}
