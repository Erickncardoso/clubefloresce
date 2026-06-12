import {
  buildImageVisionPrompt,
  buildPdfAnalysisPrompt,
  buildRestaurantVisionPrompt,
  buildSystemPromptForTopic,
  buildVisionMemoryPrefix,
  getDefaultImageUserText,
  getImageAnalysisFailureMessage,
} from "./prompts";
import { runInputGuardrails, sanitizeOutput } from "./guardrails";
import { OpenAIClient, buildImageDataUrl } from "./openai.client";
import { buildUserContext } from "./context-builder";
import { generateFallbackReply } from "./fallback-handler";
import { buildRestaurantAdvisorContext } from "./meal-plan-context";
import { buildRestaurantAdvisorPrompt } from "./restaurant-guide";
import {
  buildConversationMemoryBlock,
  prepareHistoryForModel,
} from "./conversation-memory";
import { getBellaModels, getModelForTask, resolveTaskType } from "./model-config";
import { extractPdfText } from "./pdf-extractor";
import { executeTool, getToolsForTopic, isKnownTool } from "./tools";
import {
  getTopicOfflineReply,
  getTopicTaskHint,
  isLikelyGreeting,
  normalizeTopic,
  type BellaChatTopic,
} from "./topic-config";
import { evaluateTopicRedirect } from "./topic-router";
import type { RestaurantIntent } from "./restaurant-intent";
import type {
  BellaTaskType,
  BellaToolExecution,
  BellaToolName,
  ChatMessage,
  OrchestratorInput,
  OrchestratorMeta,
  OrchestratorResult,
} from "./types";

const MAX_ITERATIONS = 4;
const MAX_HISTORY = 16;
const MAX_IMAGE_HISTORY = 6;

export class BellaOrchestratorService {
  private llm = new OpenAIClient();

  isAiEnabled(): boolean {
    return this.llm.isEnabled();
  }

  getModels() {
    return getBellaModels();
  }

  async run(userId: string, input: OrchestratorInput, priorHistory: ChatMessage[]): Promise<OrchestratorResult> {
    const userMessage = input.userMessage?.trim() || "";
    const attachment = input.attachment;
    const topic = normalizeTopic(input.topic);
    const taskHint = input.taskHint?.trim() || getTopicTaskHint(topic);
    const taskType = resolveTaskType({
      topic,
      message: userMessage,
      mimeType: attachment?.mimeType,
      taskHint,
      hasFile: Boolean(attachment),
    });

    if (!userMessage && !attachment) {
      throw new Error("Envie uma mensagem ou anexe um arquivo.");
    }

    const guardrailText = userMessage || attachment?.fileName || "arquivo";
    const guardrail = runInputGuardrails(guardrailText);
    if (guardrail.blocked && guardrail.response) {
      return this.blockedResult(guardrail.response, guardrail.reason, taskType, topic, attachment);
    }

    if (attachment && taskType === "image") {
      return this.runImageAnalysis(
        userId,
        userMessage,
        attachment,
        priorHistory,
        taskType,
        topic,
        input.patientDateKey,
        input.restaurantIntent,
        input.restaurantContextBlock,
      );
    }

    if (attachment && taskType === "pdf") {
      return this.runPdfAnalysis(userId, userMessage, attachment, taskType, topic, input.patientDateKey);
    }

    if (!userMessage) {
      throw new Error("Escreva uma pergunta junto com o arquivo ou envie só texto.");
    }

    return this.runChat(
      userId,
      userMessage,
      priorHistory,
      taskType,
      topic,
      input.patientDateKey,
      input.restaurantIntent,
      input.restaurantContextBlock,
    );
  }

  private async runImageAnalysis(
    userId: string,
    userMessage: string,
    attachment: NonNullable<OrchestratorInput["attachment"]>,
    priorHistory: ChatMessage[],
    taskType: BellaTaskType,
    topic: BellaChatTopic,
    patientDateKey?: string,
    restaurantIntent?: RestaurantIntent,
    restaurantContextBlock?: string,
  ): Promise<OrchestratorResult> {
    const userContext = await buildUserContext(userId, patientDateKey);
    const model = getModelForTask("image");
    const conversationMemory = buildConversationMemoryBlock(topic, priorHistory);

    if (!this.llm.isEnabled()) {
      return {
        reply: getTopicOfflineReply(topic, userContext.firstName),
        meta: this.baseMeta("image", model, [], true, topic, attachment),
      };
    }

    const restaurantAdvisor =
      topic === "restaurant"
        ? await buildRestaurantAdvisorContext(userId, patientDateKey)
        : undefined;

    const restaurantBlock =
      topic === "restaurant"
        ? restaurantContextBlock ||
          (restaurantAdvisor
            ? buildRestaurantAdvisorPrompt(restaurantAdvisor, restaurantIntent)
            : undefined)
        : undefined;

    const dataUrl = buildImageDataUrl(attachment.buffer, attachment.mimeType);
    const systemPrompt =
      buildVisionMemoryPrefix(userContext, conversationMemory) +
      (topic === "restaurant" && restaurantBlock
        ? buildRestaurantVisionPrompt(
            userContext,
            userMessage,
            restaurantAdvisor,
            restaurantIntent,
            restaurantBlock,
          )
        : buildImageVisionPrompt(topic, userContext, userMessage, restaurantAdvisor, restaurantIntent));
    const defaultUserText = getDefaultImageUserText(topic);

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...prepareHistoryForModel(priorHistory, MAX_IMAGE_HISTORY).map((m) => ({
        ...m,
        content: flattenHistoryContent(m.content),
      })),
      {
        role: "user",
        content: [
          {
            type: "text",
            text: userMessage || defaultUserText,
          },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ];

    const completion = await this.llm.complete({
      messages,
      model,
      temperature: 0.35,
      maxTokens: topic === "meal" ? 1400 : topic === "restaurant" ? 1200 : 900,
    });

    const reply =
      completion.content ||
      getImageAnalysisFailureMessage(topic);

    return {
      reply: sanitizeOutput(reply),
      meta: this.baseMeta("image", model, [], false, topic, attachment),
    };
  }

  private async runPdfAnalysis(
    userId: string,
    userMessage: string,
    attachment: NonNullable<OrchestratorInput["attachment"]>,
    taskType: BellaTaskType,
    topic: BellaChatTopic,
    patientDateKey?: string,
  ): Promise<OrchestratorResult> {
    const userContext = await buildUserContext(userId, patientDateKey);
    const model = getModelForTask("pdf");

    if (!this.llm.isEnabled()) {
      return {
        reply:
          "Para ler PDFs, preciso da OpenAI configurada no servidor. " +
          "Você pode descrever o conteúdo em texto que te ajudo a interpretar.",
        meta: this.baseMeta("pdf", model, [], true, topic, attachment),
      };
    }

    let pdfText: string;
    try {
      const extracted = await extractPdfText(attachment.buffer, attachment.fileName);
      pdfText = extracted.text;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao ler PDF.";
      return {
        reply: message,
        meta: this.baseMeta("pdf", model, [], true, topic, attachment),
      };
    }

    const prompt =
      buildVisionMemoryPrefix(userContext) +
      buildPdfAnalysisPrompt(
      topic,
      userContext,
      attachment.fileName,
      pdfText,
      userMessage || "Resuma este documento para mim.",
    );

    const completion = await this.llm.complete({
      messages: [{ role: "user", content: prompt }],
      model,
      temperature: 0.35,
      maxTokens: 1000,
    });

    const reply =
      completion.content ||
      "Li o PDF, mas não consegui montar um resumo agora. Tente enviar novamente ou pergunte sobre um trecho específico.";

    return {
      reply: sanitizeOutput(reply),
      meta: this.baseMeta("pdf", model, [], false, topic, attachment),
    };
  }

  private async runChat(
    userId: string,
    userMessage: string,
    priorHistory: ChatMessage[],
    taskType: BellaTaskType,
    topic: BellaChatTopic,
    patientDateKey?: string,
    restaurantIntent?: RestaurantIntent,
    restaurantContextBlock?: string,
  ): Promise<OrchestratorResult> {
    const userContext = await buildUserContext(userId, patientDateKey);
    const model = getModelForTask("chat");
    const conversationMemory = buildConversationMemoryBlock(topic, priorHistory);

    if (!this.llm.isEnabled()) {
      const fallback = await generateFallbackReply(userId, userMessage, userContext.firstName, topic);
      return {
        reply: fallback.reply,
        meta: {
          ...this.baseMeta("chat", null, fallback.toolsUsed, true, topic),
          taskType: "chat",
        },
      };
    }

    if (isLikelyGreeting(userMessage)) {
      return {
        reply: sanitizeOutput(getTopicOfflineReply(topic, userContext.firstName)),
        meta: {
          ...this.baseMeta("chat", model, [], false, topic, undefined, 0),
          taskType: "chat",
        },
      };
    }

    const redirect = evaluateTopicRedirect({
      topic,
      message: userMessage,
      firstName: userContext.firstName,
    });
    if (redirect && !restaurantIntent) {
      return {
        reply: sanitizeOutput(redirect.reply),
        meta: {
          ...this.baseMeta("chat", model, [], false, topic, undefined, 0),
          taskType: "chat",
          redirectTopic: redirect.targetTopic,
        },
      };
    }

    const toolsUsed: BellaToolName[] = [];
    let iterations = 0;

    const topicExtra =
      topic === "restaurant"
        ? restaurantContextBlock ||
          buildRestaurantAdvisorPrompt(
            await buildRestaurantAdvisorContext(userId, patientDateKey),
            restaurantIntent,
          )
        : undefined;

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: buildSystemPromptForTopic(topic, userContext, topicExtra, conversationMemory),
      },
      ...prepareHistoryForModel(priorHistory, MAX_HISTORY),
      { role: "user", content: userMessage },
    ];

    const toolDefinitions = getToolsForTopic(topic);
    const ctx = { userId, patientDateKey };

    while (iterations < MAX_ITERATIONS) {
      iterations += 1;

      const completion = await this.llm.complete({
        messages,
        model,
        tools: toolDefinitions,
        temperature: 0.35,
        maxTokens: topic === "restaurant" ? 1200 : 900,
      });

      if (completion.toolCalls.length === 0) {
        const reply =
          completion.content || (await this.synthesizeFallback(userId, userMessage, userContext.firstName, topic));
        return {
          reply: sanitizeOutput(reply),
          meta: {
            ...this.baseMeta("chat", model, toolsUsed, !completion.content, topic, undefined, iterations),
            taskType: "chat",
          },
        };
      }

      messages.push({
        role: "assistant",
        content: completion.content || "",
        tool_calls: completion.toolCalls,
      });

      for (const call of completion.toolCalls) {
        const toolName = call.function.name;
        let args: Record<string, unknown> = {};

        try {
          args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }

        if (isKnownTool(toolName) && !toolsUsed.includes(toolName)) {
          toolsUsed.push(toolName);
        }

        const result = await executeTool(toolName, args, ctx);
        this.logToolExecution({ name: toolName as BellaToolName, args, result });

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
      }
    }

    const final = await this.llm.complete({ messages, model, temperature: 0.35, maxTokens: 700 });
    const reply =
      final.content || (await this.synthesizeFallback(userId, userMessage, userContext.firstName, topic));

    return {
      reply: sanitizeOutput(reply),
      meta: {
        ...this.baseMeta("chat", model, toolsUsed, false, topic, undefined, iterations),
        taskType: "chat",
      },
    };
  }

  private blockedResult(
    response: string,
    reason: OrchestratorMeta["guardrail"],
    taskType: BellaTaskType,
    topic: BellaChatTopic,
    attachment?: OrchestratorInput["attachment"],
  ): OrchestratorResult {
    return {
      reply: response,
      meta: {
        aiEnabled: this.llm.isEnabled(),
        usedFallback: true,
        model: getModelForTask(taskType),
        taskType,
        topic,
        toolsUsed: [],
        guardrail: reason,
        iterations: 0,
        attachment: attachment ? this.attachmentMeta(attachment) : undefined,
      },
    };
  }

  private baseMeta(
    taskType: BellaTaskType,
    model: string | null,
    toolsUsed: BellaToolName[],
    usedFallback: boolean,
    topic: BellaChatTopic,
    attachment?: NonNullable<OrchestratorInput["attachment"]>,
    iterations = 0,
  ): OrchestratorMeta {
    return {
      aiEnabled: this.llm.isEnabled(),
      usedFallback,
      model,
      taskType,
      topic,
      toolsUsed,
      iterations,
      attachment: attachment ? this.attachmentMeta(attachment) : undefined,
    };
  }

  private attachmentMeta(attachment: NonNullable<OrchestratorInput["attachment"]>) {
    return {
      type: attachment.mimeType === "application/pdf" ? ("pdf" as const) : ("image" as const),
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.buffer.length,
    };
  }

  private async synthesizeFallback(
    userId: string,
    message: string,
    firstName: string,
    topic: BellaChatTopic,
  ): Promise<string> {
    const fallback = await generateFallbackReply(userId, message, firstName, topic);
    return fallback.reply;
  }

  private logToolExecution(execution: BellaToolExecution): void {
    if (process.env.BELLA_DEBUG === "true") {
      console.log("[BELLA][tool]", execution.name, execution.result.slice(0, 200));
    }
  }
}

function flattenHistoryContent(content: ChatMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join(" ");
}
