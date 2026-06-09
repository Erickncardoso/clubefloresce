import type { BellaToolContext, BellaToolName, OpenAIToolDefinition } from "../types";
import { checkinToolDefinition, executeCheckinTool } from "./checkin.tool";
import { contentSearchToolDefinition, executeContentSearchTool } from "./content-search.tool";
import { coursesToolDefinition, executeCoursesToolForUser } from "./courses.tool";
import {
  dailyDiaryToolDefinition,
  executeDailyDiaryTool,
  executeMealPlanTool,
  mealPlanToolDefinition,
} from "./meal-plan.tool";
import { executeUserProfileTool, userProfileToolDefinition } from "./user-profile.tool";

type ToolExecutor = (args: Record<string, unknown>, ctx: BellaToolContext) => Promise<string>;

const executors: Record<BellaToolName, ToolExecutor> = {
  get_checkin_summary: executeCheckinTool,
  list_recommended_courses: executeCoursesToolForUser,
  get_user_profile: executeUserProfileTool,
  search_educational_content: executeContentSearchTool,
  get_patient_meal_plan: executeMealPlanTool,
  get_daily_diary_summary: executeDailyDiaryTool,
};

export function getOpenAIToolDefinitions(): OpenAIToolDefinition[] {
  return [
    checkinToolDefinition,
    coursesToolDefinition,
    userProfileToolDefinition,
    contentSearchToolDefinition,
    mealPlanToolDefinition,
    dailyDiaryToolDefinition,
  ];
}

export { getToolsForTopic } from "../topic-config";

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: BellaToolContext,
): Promise<string> {
  if (!ctx.userId) {
    return "Erro de contexto: paciente não identificado.";
  }

  const executor = executors[name as BellaToolName];
  if (!executor) {
    return `Ferramenta desconhecida: ${name}`;
  }

  try {
    return await executor(args, ctx);
  } catch (err) {
    console.error(`[BELLA][tool:${name}]`, err);
    return `Erro ao executar ${name}. Tente novamente ou reformule a pergunta.`;
  }
}

export function isKnownTool(name: string): name is BellaToolName {
  return name in executors;
}
