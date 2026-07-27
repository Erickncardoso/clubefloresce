import type { KnowledgeSourceType } from "@prisma/client";
import { ragRetrievalService } from "../../rag/retrieval.service";
import type { BellaToolContext } from "../types";

export const knowledgeSearchToolDefinition = {
  type: "function" as const,
  function: {
    name: "search_knowledge_base" as const,
    description:
      "Busca semântica na base de conhecimento do Clube Florescer: aulas, ebooks, cursos, posts, alimentos TBCA/TACO, plano da paciente e orientações. Use para dúvidas educacionais ou temas que podem estar no acervo.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Pergunta ou tema a buscar.",
        },
        limit: {
          type: "number",
          description: "Máximo de resultados (1-8). Padrão: 5.",
        },
        sourceTypes: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "lesson",
              "ebook",
              "course",
              "post",
              "meal_plan",
              "checkin",
              "profile",
              "food",
              "nutri_note",
            ],
          },
          description: "Opcional — restringe tipos de fonte.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
};

export async function executeKnowledgeSearchTool(
  args: Record<string, unknown>,
  ctx: BellaToolContext,
): Promise<string> {
  const query = String(args.query || "").trim();
  const limit = Math.min(8, Math.max(1, Number(args.limit) || 5));
  const sourceTypes = Array.isArray(args.sourceTypes)
    ? args.sourceTypes.map((item) => String(item)) as KnowledgeSourceType[]
    : undefined;

  if (!query) {
    return "Informe um termo ou pergunta para buscar na base de conhecimento.";
  }

  const result = await ragRetrievalService.retrieve({
    userId: ctx.userId,
    query,
    limit,
    sourceTypes,
    skipQueryExpansion: false,
    skipLogging: true,
  });

  return ragRetrievalService.formatToolResult(result);
}
