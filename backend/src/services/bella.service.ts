import { BellaRepository } from "../repositories/bella.repository";
import { BellaOrchestratorService } from "./bella/bella-orchestrator.service";
import { analyzeMealStructured } from "./bella/meal-structured-analyzer";
import type { BellaTaskType, ChatMessage, OrchestratorInput, OrchestratorMeta } from "./bella/types";
import { resolveTaskType } from "./bella/model-config";
import { getTopicTaskHint, normalizeTopic, type BellaChatTopic } from "./bella/topic-config";
import { FoodDiaryService } from "./food-diary.service";
import { cloudinaryUpload } from "../utils/cloudinary";
import {
  buildMealAnalysisPreview,
  resolveMealSlot,
} from "./bella/meal-plan-context";
import { inferMealLabel } from "../utils/meal-time";

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
    const mealTypeInput = payload.mealType?.trim();
    const mealLabelInput = payload.mealLabel?.trim();
    const slot = await resolveMealSlot(userId);
    const mealType = mealTypeInput && mealTypeInput !== "other" ? mealTypeInput : slot.mealType;
    const mealLabel = mealLabelInput || slot.mealLabel;

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
        patientDateKey,
      );
      const dailySummary = await foodDiaryService.getDailySummary(userId, patientDateKey);
      const resolvedLabel = mealLabel || inferMealLabel(mealType);
      const previewReply = buildMealAnalysisPreview(
        resolvedLabel,
        mealDraft.items,
        mealDraft.totals,
        dailySummary,
        mealDraft.notes,
      );

      const previewMsg = await bellaRepository.create(userId, "assistant", previewReply, {
        topic: "meal",
        metadata: {
          topic: "meal",
          taskType: "meal_diary",
          pendingConfirmation: true,
        },
      });

      return {
        topic,
        userMessage: userMsg,
        requiresMealConfirmation: true,
        mealDraft: {
          ...mealDraft,
          mealType,
          mealLabel: resolvedLabel,
          imageUrl: attachmentUrl,
          userMessageId: userMsg.id,
        },
        dailySummary,
        message: previewMsg,
        meta: {
          taskType: "image",
          topic: "meal",
          pendingConfirmation: true,
        },
      };
    }

    const history = await bellaRepository.findRecentByUser(userId, topic, 30);
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
      patientDateKey,
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


function buildUserDisplayContent(
  message: string,
  file: Express.Multer.File | undefined,
  taskType: BellaTaskType,
  topic: BellaChatTopic,
): string {
  if (message) return message;
  if (!file) return "";
  if (taskType === "pdf") return "Analise este PDF, por favor.";
  if (topic === "meal") return "Analise meu prato para registrar no diário de hoje.";
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
