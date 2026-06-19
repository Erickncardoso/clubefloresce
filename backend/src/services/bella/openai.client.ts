import type { ChatMessage, LLMCompletionResult, MessageContent, OpenAIToolDefinition } from "./types";
import { readEnv } from "../../utils/env";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_REQUEST_TIMEOUT_MS = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS || 90_000);

export class OpenAIApiError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "OpenAIApiError";
    this.statusCode = statusCode;
  }
}

export class OpenAIClient {
  private apiKey: string | null;

  constructor() {
    this.apiKey = readEnv("OPENAI_API_KEY");
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(params: {
    messages: ChatMessage[];
    model: string;
    tools?: OpenAIToolDefinition[];
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: "json_object" };
  }): Promise<LLMCompletionResult> {
    const model = params.model;

    if (!this.apiKey) {
      return { content: null, toolCalls: [], finishReason: "no_api_key", model };
    }

    const body: Record<string, unknown> = {
      model,
      messages: params.messages.map((m) => toOpenAIMessage(m)),
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 800,
    };

    if (params.tools?.length) {
      body.tools = params.tools;
      body.tool_choice = "auto";
    }

    if (params.responseFormat) {
      body.response_format = params.responseFormat;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new OpenAIApiError(
          "A análise demorou muito. Tente outra foto com boa luz ou aguarde um instante e envie de novo.",
          504,
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("[BELLA][OpenAI] error:", res.status, errText);

      let detail = `Erro na OpenAI (${res.status}). Verifique OPENAI_API_KEY e o saldo da conta.`;
      try {
        const parsed = JSON.parse(errText) as { error?: { message?: string } };
        if (parsed.error?.message) detail = parsed.error.message;
      } catch {
        /* ignore parse */
      }

      throw new OpenAIApiError(detail, res.status);
    }

    const json = (await res.json()) as {
      choices?: {
        message?: {
          content?: string | null;
          tool_calls?: LLMCompletionResult["toolCalls"];
        };
        finish_reason?: string;
      }[];
    };

    const choice = json.choices?.[0];
    const message = choice?.message;
    const rawContent = message?.content;
    const textContent =
      typeof rawContent === "string" ? rawContent.trim() : rawContent ? null : null;

    return {
      content: textContent || null,
      toolCalls: message?.tool_calls || [],
      finishReason: choice?.finish_reason || null,
      model,
    };
  }
}

function toOpenAIMessage(message: ChatMessage): Record<string, unknown> {
  if (message.role === "tool") {
    return {
      role: "tool",
      tool_call_id: message.tool_call_id,
      content: stringifyContent(message.content),
    };
  }

  if (message.role === "assistant" && message.tool_calls?.length) {
    return {
      role: "assistant",
      content: stringifyContent(message.content) || null,
      tool_calls: message.tool_calls,
    };
  }

  const content = message.content;
  if (Array.isArray(content)) {
    return { role: message.role, content };
  }

  return { role: message.role, content };
}

function stringifyContent(content: MessageContent): string {
  if (typeof content === "string") return content;
  return content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export function buildImageDataUrl(buffer: Buffer, mimeType: string): string {
  const safeMime = mimeType.startsWith("image/") ? mimeType : "image/jpeg";
  return `data:${safeMime};base64,${buffer.toString("base64")}`;
}
