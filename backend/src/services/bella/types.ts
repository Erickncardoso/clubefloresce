import type { BellaTaskType } from "./model-config";
import type { RestaurantIntent } from "./restaurant-intent";

export type { BellaTaskType };

export type BellaToolName =
  | "get_user_profile"
  | "get_checkin_summary"
  | "list_recommended_courses"
  | "search_educational_content"
  | "get_patient_meal_plan"
  | "get_daily_diary_summary";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export type MessageContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

export type MessageContent = string | MessageContentPart[];

export interface ChatMessage {
  role: ChatRole;
  content: MessageContent;
  tool_call_id?: string;
  tool_calls?: OpenAIToolCall[];
}

export interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIToolDefinition {
  type: "function";
  function: {
    name: BellaToolName;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMCompletionResult {
  content: string | null;
  toolCalls: OpenAIToolCall[];
  finishReason: string | null;
  model: string;
}

export interface BellaToolContext {
  userId: string;
  patientDateKey?: string;
}

export interface BellaToolExecution {
  name: BellaToolName;
  args: Record<string, unknown>;
  result: string;
}

export interface GuardrailResult {
  blocked: boolean;
  reason?: "medical_emergency" | "self_harm" | "abuse";
  response?: string;
}

export interface BellaAttachmentMeta {
  type: "image" | "pdf";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface OrchestratorMeta {
  aiEnabled: boolean;
  usedFallback: boolean;
  model: string | null;
  taskType: BellaTaskType;
  topic: string;
  toolsUsed: BellaToolName[];
  guardrail?: GuardrailResult["reason"];
  iterations: number;
  attachment?: BellaAttachmentMeta;
  redirectTopic?: string;
}

export interface OrchestratorInput {
  userMessage: string;
  topic?: string;
  taskHint?: string;
  patientDateKey?: string;
  patientTimeZone?: string;
  restaurantIntent?: RestaurantIntent;
  restaurantContextBlock?: string;
  contextImageUrl?: string;
  handoffFromTopic?: string;
  crossTopicContext?: string;
  attachment?: {
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  };
}

export interface OrchestratorResult {
  reply: string;
  meta: OrchestratorMeta;
}

export interface UserContextSnapshot {
  userId: string;
  name: string;
  firstName: string;
  plan: string;
  memberSince: string;
  checkInSummary: string;
  availableCourses: string;
  verifiedMemory: string;
  currentMealSlot: string;
  hasMealPlan: boolean;
}
