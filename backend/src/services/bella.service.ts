import { BellaRepository } from "../repositories/bella.repository";
import { BellaOrchestratorService } from "./bella/bella-orchestrator.service";
import { analyzeMealStructured } from "./bella/meal-structured-analyzer";
import type { BellaTaskType, ChatMessage, OrchestratorInput, OrchestratorMeta } from "./bella/types";
import { resolveTaskType } from "./bella/model-config";
import { getTopicTaskHint, normalizeTopic, type BellaChatTopic } from "./bella/topic-config";
import { FoodDiaryService } from "./food-diary.service";
import { cloudinaryUpload } from "../utils/cloudinary";

const bellaRepository = new BellaRepository();
const orchestrator = new BellaOrchestratorService();
const foodDiaryService = new FoodDiaryService();

export interface BellaChatPayload {
  message?: string;
  topic?: string;
  taskHint?: string;
  mealType?: string;
  mealLabel?: string;
  file?: Express.Multer.File;
}

export class BellaService {
  async getMessages(userId: string, topicRaw?: string, patientDateKey?: string) {
    const topic = normalizeTopic(topicRaw);
    const messages = await bellaRepository.findRecentByUser(userId, topic, 50);
    const models = orchestrator.getModels();
    const dailySummary =
      topic === "meal" ? await foodDiaryService.getDailySummary(userId, patientDateKey) : undefined;
    return {
      topic,
      messages,
      aiEnabled: orchestrator.isAiEnabled(),
      models,
      dailySummary,
    };
  }

  async chat(userId: string, payload: BellaChatPayload, patientDateKey?: string) {
    const message = payload.message?.trim() || "";
    const file = payload.file;
    const topic = normalizeTopic(payload.topic);
    const taskHint = payload.taskHint?.trim() || getTopicTaskHint(topic);
    const mealType = payload.mealType?.trim() || "other";
    const mealLabel = payload.mealLabel?.trim() || undefined;

    if (!message && !file) throw new Error("Envie uma mensagem ou anexe um arquivo.");
    if (message.length > 4000) throw new Error("Mensagem muito longa.");

    const taskType = resolveTaskType({
      topic,
      message,
      mimeType: file?.mimetype,
      taskHint,
      hasFile: Boolean(file),
    });

    const userContent = buildUserDisplayContent(message, file, taskType, topic);
    const attachmentUrl = file ? await uploadChatAttachment(file, taskType) : undefined;

    const userMsg = await bellaRepository.create(userId, "user", userContent, {
      topic,
      metadata: file
        ? {
            topic,
            taskType,
            attachment: {
              type: taskType === "pdf" ? "pdf" : "image",
              fileName: file.originalname,
              mimeType: file.mimetype,
              sizeBytes: file.size,
              ...(attachmentUrl ? { url: attachmentUrl } : {}),
            },
          }
        : { topic, taskType },
    });

    if (topic === "meal" && file && taskType === "image") {
      const mealDraft = await analyzeMealStructured(
        userId,
        file.buffer,
        file.mimetype,
        message || userContent,
      );
      const dailySummary = await foodDiaryService.getDailySummary(userId, patientDateKey);

      return {
        topic,
        userMessage: userMsg,
        requiresMealConfirmation: true,
        mealDraft: {
          ...mealDraft,
          mealType,
          mealLabel: mealLabel || inferMealLabel(mealType),
          imageUrl: attachmentUrl,
          userMessageId: userMsg.id,
        },
        dailySummary,
        message: null,
        meta: {
          taskType: "image",
          topic: "meal",
          pendingConfirmation: true,
        },
      };
    }

    const history = await bellaRepository.findRecentByUser(userId, topic, 20);
    const prior: ChatMessage[] = history
      .slice(0, -1)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const input: OrchestratorInput = {
      userMessage: message,
      topic,
      taskHint,
      attachment: file
        ? {
            buffer: file.buffer,
            mimeType: file.mimetype,
            fileName: file.originalname,
          }
        : undefined,
    };

    const { reply, meta } = await orchestrator.run(userId, input, prior);

    const assistantMsg = await bellaRepository.create(userId, "assistant", reply, {
      topic,
      metadata: meta,
    });

    return {
      topic,
      message: assistantMsg,
      userMessage: userMsg,
      meta: serializeMeta(meta),
      requiresMealConfirmation: false,
    };
  }
}

async function uploadChatAttachment(
  file: Express.Multer.File,
  taskType: BellaTaskType,
): Promise<string | undefined> {
  if (taskType !== "image" || !file.mimetype.startsWith("image/")) return undefined;

  try {
    return await cloudinaryUpload(file.buffer, "clube-bella-chat", {
      resourceType: "image",
      fileSizeBytes: file.size,
    });
  } catch (err) {
    console.error("[Bella] Falha ao salvar imagem do chat:", err);
    return undefined;
  }
}

function inferMealLabel(mealType: string): string {
  const labels: Record<string, string> = {
    breakfast: "Café da manhã",
    snack1: "Lanche da manhã",
    lunch: "Almoço",
    snack2: "Lanche da tarde",
    dinner: "Jantar",
  };
  return labels[mealType] || "Refeição";
}

function buildUserDisplayContent(
  message: string,
  file: Express.Multer.File | undefined,
  taskType: BellaTaskType,
  topic: BellaChatTopic,
): string {
  if (message) return message;
  if (!file) return "";
  if (taskType === "pdf") return "Analise este PDF, por favor.";
  if (topic === "meal") return "Analise meu prato, por favor.";
  if (topic === "label") return "Analise este rótulo, por favor.";
  return "Analise esta imagem, por favor.";
}

function serializeMeta(meta: OrchestratorMeta) {
  return {
    aiEnabled: meta.aiEnabled,
    usedFallback: meta.usedFallback,
    model: meta.model,
    taskType: meta.taskType,
    topic: meta.topic,
    toolsUsed: meta.toolsUsed,
    guardrail: meta.guardrail ?? null,
    iterations: meta.iterations,
    attachment: meta.attachment ?? null,
  };
}
