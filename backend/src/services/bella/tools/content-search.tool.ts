import { executeKnowledgeSearchTool, knowledgeSearchToolDefinition } from "./knowledge-search.tool";

export const contentSearchToolDefinition = knowledgeSearchToolDefinition;

export async function executeContentSearchTool(
  args: Record<string, unknown>,
  ctx: import("../types").BellaToolContext,
): Promise<string> {
  return executeKnowledgeSearchTool(args, ctx);
}
