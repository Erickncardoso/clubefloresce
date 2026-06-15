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
  buildRestaurantAdvisorContext,
  resolveMealSlot,
} from "./bella/meal-plan-context";
import { buildRestaurantAdvisorPrompt } from "./bella/restaurant-guide";
import { inferMealLabel } from "../utils/meal-time";
import {
  buildCustomSwap,
  buildSwapSuggestions,
  buildSuggestionButtonOptions,
  formatSwapSuggestionsIntro,
  formatSwapSuggestionsReply,
  getSwapFoodOptions,
  getSwapMealOptions,
} from "./bella/food-swap.service";
import {
  buildSwapModeMetadata,
  buildSwapSelectionMetadata,
  SWAP_FOOD_QUESTION,
  SWAP_MEAL_QUESTION,
  SWAP_MODE_QUESTION,
  SWAP_NO_PLAN_MESSAGE,
} from "./bella/swap-flow";
import {
  detectRestaurantIntentFromMessage,
  normalizeRestaurantIntent,
  RESTAURANT_INTENT_LABELS,
  RESTAURANT_INTENT_QUESTION,
  type RestaurantIntent,
} from "./bella/restaurant-intent";

const bellaRepository = new BellaRepository();
const orchestrator = new BellaOrchestratorService();
const foodDiaryService = new FoodDiaryService();

export interface BellaChatPayload {
  message?: string;
  topic?: string;
  taskHint?: string;
  mealType?: string;
  mealLabel?: string;
  restaurantIntent?: string;
  continueFromUserMessageId?: string;
  swapAction?: string;
  swapMealId?: string;
  swapFoodKey?: string;
  swapSelectionMessageId?: string;
  file?: Express.Multer.File;
}

type StoredAttachmentMeta = {
  type?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
};

export class BellaService {
  async getMessages(userId: string, topicRaw?: string, patientDateKey?: string) {
    const topic = normalizeTopic(topicRaw);
    const messages = await bellaRepository.findRecentByUser(userId, topic, 100);
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
    const topic = normalizeTopic(payload.topic);
    const restaurantIntent = normalizeRestaurantIntent(payload.restaurantIntent);
    const continueFromUserMessageId = payload.continueFromUserMessageId?.trim();

    if (topic === "restaurant" && restaurantIntent && continueFromUserMessageId) {
      return this.continueRestaurantChat(
        userId,
        continueFromUserMessageId,
        restaurantIntent,
        patientDateKey,
      );
    }

    const swapAction = payload.swapAction?.trim();
    if (topic === "swap") {
      return this.handleSwapFlow(
        userId,
        { ...payload, swapAction: swapAction || "init" },
        patientDateKey,
      );
    }

    const message = payload.message?.trim() || "";
    const file = payload.file;
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

    if (topic === "restaurant") {
      const detectedIntent = detectRestaurantIntentFromMessage(message);
      if (detectedIntent) {
        return this.runRestaurantAnalysis(
          userId,
          userMsg,
          detectedIntent,
          patientDateKey,
          file,
          taskHint,
          { createChoiceMessage: false },
        );
      }

      const intentMsg = await bellaRepository.create(userId, "assistant", RESTAURANT_INTENT_QUESTION, {
        topic: "restaurant",
        metadata: {
          topic: "restaurant",
          taskType: "chat",
          pendingRestaurantIntent: true,
          relatedUserMessageId: userMsg.id,
        },
      });

      return {
        topic,
        userMessage: userMsg,
        message: intentMsg,
        requiresMealConfirmation: false,
        requiresRestaurantIntent: true,
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
      requiresRestaurantIntent: false,
    };
  }

  private async handleSwapFlow(
    userId: string,
    payload: BellaChatPayload,
    patientDateKey?: string,
  ) {
    const action = payload.swapAction?.trim() || "init";
    const swapMealId = payload.swapMealId?.trim();
    const swapFoodKey = payload.swapFoodKey?.trim();
    const selectionMessageId = payload.swapSelectionMessageId?.trim();

    if (selectionMessageId) {
      await bellaRepository.resolvePendingSwapSelection(userId, selectionMessageId);
      await bellaRepository.resolvePendingSwapMode(userId, selectionMessageId);
    }

    if (action === "show_suggestions") {
      if (!swapMealId || !swapFoodKey) {
        throw new Error("Selecione refeição e alimento.");
      }

      const analysis = await buildSwapSuggestions(userId, swapMealId, swapFoodKey);
      if (!analysis) throw new Error("Não encontrei esse alimento no seu plano.");

      const userMsg = await bellaRepository.create(userId, "user", "Ver sugestões", {
        topic: "swap",
        metadata: { topic: "swap", swapMealId, swapFoodKey },
      });

      const suggestionOptions = buildSuggestionButtonOptions(analysis.suggestions);
      const hasSuggestionButtons = suggestionOptions.length > 0 && !analysis.categoryBlocked;

      const assistantMsg = await bellaRepository.create(
        userId,
        "assistant",
        hasSuggestionButtons
          ? formatSwapSuggestionsIntro(analysis)
          : formatSwapSuggestionsReply(analysis),
        {
          topic: "swap",
          metadata: hasSuggestionButtons
            ? {
                ...buildSwapSelectionMetadata("suggestion", suggestionOptions),
                swapMealId,
                swapFoodKey,
              }
            : { topic: "swap", taskType: "chat", swapMealId, swapFoodKey },
        },
      );

      return {
        topic: "swap" as const,
        userMessage: userMsg,
        message: assistantMsg,
        requiresMealConfirmation: false,
        requiresRestaurantIntent: false,
        requiresSwapSelection: hasSuggestionButtons,
      };
    }

    if (action === "custom_food") {
      if (!swapMealId || !swapFoodKey) {
        throw new Error("Selecione refeição e alimento.");
      }

      const replacementName = payload.message?.trim();
      if (!replacementName) {
        throw new Error("Digite o alimento que quer incluir no lugar.");
      }

      const userMsg = await bellaRepository.create(userId, "user", replacementName, {
        topic: "swap",
        metadata: { topic: "swap", swapMealId, swapFoodKey },
      });

      const result = await buildCustomSwap(userId, swapMealId, swapFoodKey, replacementName);
      const assistantMsg = await bellaRepository.create(userId, "assistant", result.reply, {
        topic: "swap",
        metadata: { topic: "swap", taskType: "chat", swapMealId, swapFoodKey },
      });

      return {
        topic: "swap" as const,
        userMessage: userMsg,
        message: assistantMsg,
        requiresMealConfirmation: false,
        requiresRestaurantIntent: false,
        requiresSwapSelection: false,
      };
    }

    if (action === "select_food") {
      if (!swapMealId || !swapFoodKey) {
        throw new Error("Selecione a refeição e o alimento para substituir.");
      }

      const foodOptions = await getSwapFoodOptions(userId, swapMealId);
      const selected = foodOptions?.options.find((option) => option.id === swapFoodKey);
      if (!selected) {
        throw new Error("Alimento não encontrado nesta refeição.");
      }

      const userMsg = await bellaRepository.create(userId, "user", selected.label, {
        topic: "swap",
        metadata: {
          topic: "swap",
          swapMealId,
          swapFoodKey,
        },
      });

      const assistantMsg = await bellaRepository.create(userId, "assistant", SWAP_MODE_QUESTION, {
        topic: "swap",
        metadata: buildSwapModeMetadata(swapMealId, swapFoodKey),
      });

      return {
        topic: "swap" as const,
        userMessage: userMsg,
        message: assistantMsg,
        requiresMealConfirmation: false,
        requiresRestaurantIntent: false,
        requiresSwapSelection: true,
      };
    }

    if (action === "select_meal") {
      if (!swapMealId) {
        throw new Error("Selecione uma refeição.");
      }

      const meals = await getSwapMealOptions(userId);
      const meal = meals.find((entry) => entry.id === swapMealId);
      if (!meal) {
        throw new Error("Refeição não encontrada no plano.");
      }

      const userMsg = await bellaRepository.create(userId, "user", meal.label, {
        topic: "swap",
        metadata: { topic: "swap", swapMealId },
      });

      const foodData = await getSwapFoodOptions(userId, swapMealId);
      if (!foodData?.options.length) {
        const assistantMsg = await bellaRepository.create(
          userId,
          "assistant",
          "Não encontrei alimentos nesta refeição do plano. Escolha outra refeição ou fale com sua nutricionista.",
          { topic: "swap", metadata: { topic: "swap", taskType: "chat" } },
        );
        return {
          topic: "swap" as const,
          userMessage: userMsg,
          message: assistantMsg,
          requiresMealConfirmation: false,
          requiresRestaurantIntent: false,
          requiresSwapSelection: false,
        };
      }

      const assistantMsg = await bellaRepository.create(userId, "assistant", SWAP_FOOD_QUESTION, {
        topic: "swap",
        metadata: {
          ...buildSwapSelectionMetadata("food", foodData.options),
          swapMealId,
        },
      });

      return {
        topic: "swap" as const,
        userMessage: userMsg,
        message: assistantMsg,
        requiresMealConfirmation: false,
        requiresRestaurantIntent: false,
        requiresSwapSelection: true,
      };
    }

    const meals = await getSwapMealOptions(userId);
    if (!meals.length) {
      const assistantMsg = await bellaRepository.create(userId, "assistant", SWAP_NO_PLAN_MESSAGE, {
        topic: "swap",
        metadata: { topic: "swap", taskType: "chat" },
      });
      return {
        topic: "swap" as const,
        message: assistantMsg,
        requiresMealConfirmation: false,
        requiresRestaurantIntent: false,
        requiresSwapSelection: false,
      };
    }

    const assistantMsg = await bellaRepository.create(userId, "assistant", SWAP_MEAL_QUESTION, {
      topic: "swap",
      metadata: buildSwapSelectionMetadata("meal", meals),
    });

    return {
      topic: "swap" as const,
      message: assistantMsg,
      requiresMealConfirmation: false,
      requiresRestaurantIntent: false,
      requiresSwapSelection: true,
    };
  }

  private async continueRestaurantChat(
    userId: string,
    sourceUserMessageId: string,
    restaurantIntent: RestaurantIntent,
    patientDateKey?: string,
  ) {
    const sourceMsg = await bellaRepository.findById(sourceUserMessageId);
    if (!sourceMsg || sourceMsg.userId !== userId || sourceMsg.topic !== "restaurant") {
      throw new Error("Não encontrei a mensagem original do restaurante.");
    }

    await bellaRepository.resolvePendingRestaurantIntent(userId, sourceUserMessageId);

    return this.runRestaurantAnalysis(
      userId,
      sourceMsg,
      restaurantIntent,
      patientDateKey,
      undefined,
      undefined,
      { createChoiceMessage: true },
    );
  }

  private async runRestaurantAnalysis(
    userId: string,
    sourceMsg: { id: string; content: string; metadata?: unknown },
    restaurantIntent: RestaurantIntent,
    patientDateKey?: string,
    file?: Express.Multer.File,
    taskHint?: string,
    options: { createChoiceMessage?: boolean } = {},
  ) {
    const createChoiceMessage = options.createChoiceMessage ?? true;

    let choiceMsg = null;
    if (createChoiceMessage) {
      choiceMsg = await bellaRepository.create(
        userId,
        "user",
        RESTAURANT_INTENT_LABELS[restaurantIntent],
        { topic: "restaurant", metadata: { topic: "restaurant", restaurantIntent } },
      );
    }

    const sourceMeta = (sourceMsg.metadata || {}) as Record<string, unknown>;
    const attachmentMeta = sourceMeta.attachment as StoredAttachmentMeta | undefined;
    const attachment =
      file
        ? {
            buffer: file.buffer,
            mimeType: file.mimetype,
            fileName: file.originalname,
          }
        : await resolveStoredAttachment(attachmentMeta);

    const history = await bellaRepository.findRecentByUser(userId, "restaurant", 30);
    const prior: ChatMessage[] = history
      .filter((m) => {
        if (choiceMsg && m.id === choiceMsg.id) return false;
        if (m.id === sourceMsg.id) return false;
        const meta = (m.metadata || {}) as Record<string, unknown>;
        if (meta.pendingRestaurantIntent) return false;
        return m.role === "user" || m.role === "assistant";
      })
      .map((m) => ({
        role: m.role as "user" | "assistant",
      content: m.content,
      }));

    const intentNote = createChoiceMessage
      ? `\n\n[Intenção: ${RESTAURANT_INTENT_LABELS[restaurantIntent]}]`
      : "";
    const userMessage = `${sourceMsg.content}${intentNote}`;

    const advisorCtx = await buildRestaurantAdvisorContext(userId, patientDateKey);
    const restaurantContextBlock = buildRestaurantAdvisorPrompt(advisorCtx, restaurantIntent);

    const input: OrchestratorInput = {
      userMessage,
      topic: "restaurant",
      taskHint,
      patientDateKey,
      restaurantIntent,
      restaurantContextBlock,
      attachment,
    };

    const { reply, meta } = await orchestrator.run(userId, input, prior);

    const assistantMsg = await bellaRepository.create(userId, "assistant", reply, {
      topic: "restaurant",
      metadata: {
        ...meta,
        restaurantIntent,
      },
    });

    return {
      topic: "restaurant",
      message: assistantMsg,
      userMessage: choiceMsg || sourceMsg,
      meta: serializeMeta(meta),
      requiresMealConfirmation: false,
      requiresRestaurantIntent: false,
    };
  }
}

async function resolveStoredAttachment(
  attachment?: StoredAttachmentMeta,
): Promise<OrchestratorInput["attachment"]> {
  if (!attachment?.url || attachment.type !== "image") return undefined;

  try {
    const response = await fetch(attachment.url);
    if (!response.ok) throw new Error("Falha ao carregar imagem.");
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      buffer,
      mimeType: attachment.mimeType || "image/jpeg",
      fileName: attachment.fileName || "cardapio.jpg",
    };
  } catch (err) {
    console.error("[Bella] Falha ao recuperar anexo do restaurante:", err);
    return undefined;
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
  if (topic === "restaurant") return "Qual a melhor opção para mim neste cardápio?";
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
