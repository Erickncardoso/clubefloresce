import type { BellaToolName } from "./types";
import type { OpenAIToolDefinition } from "./types";
import {
  checkinToolDefinition,
} from "./tools/checkin.tool";
import {
  contentSearchToolDefinition,
} from "./tools/content-search.tool";
import {
  coursesToolDefinition,
} from "./tools/courses.tool";
import {
  userProfileToolDefinition,
} from "./tools/user-profile.tool";

export const BELLA_TOPICS = ["general", "label", "meal", "restaurant", "swap", "ask", "goal"] as const;
export type BellaChatTopic = (typeof BELLA_TOPICS)[number];

const ALL_TOOLS: OpenAIToolDefinition[] = [
  checkinToolDefinition,
  coursesToolDefinition,
  userProfileToolDefinition,
  contentSearchToolDefinition,
];

const TOOLS_BY_TOPIC: Record<BellaChatTopic, BellaToolName[]> = {
  general: ["get_user_profile", "get_checkin_summary", "list_recommended_courses", "search_educational_content"],
  ask: ["get_user_profile", "get_checkin_summary", "list_recommended_courses", "search_educational_content"],
  label: ["search_educational_content"],
  meal: ["search_educational_content"],
  restaurant: ["search_educational_content", "get_user_profile"],
  swap: ["search_educational_content", "get_user_profile"],
  goal: ["get_checkin_summary", "get_user_profile", "list_recommended_courses"],
};

export function normalizeTopic(raw?: string | null): BellaChatTopic {
  const value = raw?.trim().toLowerCase();
  if (value && BELLA_TOPICS.includes(value as BellaChatTopic)) {
    return value as BellaChatTopic;
  }
  return "general";
}

export function getToolsForTopic(topic: BellaChatTopic): OpenAIToolDefinition[] {
  const allowed = new Set(TOOLS_BY_TOPIC[topic]);
  return ALL_TOOLS.filter((tool) => allowed.has(tool.function.name));
}

export function getTopicTaskHint(topic: BellaChatTopic): string | undefined {
  if (topic === "label") return "label";
  if (topic === "meal") return "meal";
  return undefined;
}

export function getTopicOverlay(topic: BellaChatTopic): string {
  const overlays: Record<BellaChatTopic, string> = {
    general: `## Modo: Conversa geral
Ajude com dúvidas de nutrição, hábitos e uso do app.`,
    ask: `## Modo: Fazer pergunta
Responda de forma direta e organizada. Use ferramentas quando precisar de dados do paciente ou da Biblioteca.`,
    label: `## Modo: Ler rótulo
Foco em tabela nutricional, ingredientes e comparação prática.
- Se o paciente ainda não enviou foto, peça para anexar a imagem do rótulo pelo clipe.
- Quando houver imagem, a análise visual será feita automaticamente.
- Use markdown com seções ## quando listar nutrientes.`,
    meal: `## Modo: Foto do prato
Foco em identificar alimentos na foto e estimar porção (g), calorias e macros de cada item.
- Se ainda não enviou foto, peça imagem do prato de cima, com boa luz.
- Deixe claro que são estimativas visuais, não substituem pesagem.
- Use markdown: ### por item e ## Total estimado do prato.`,
    restaurant: `## Modo: Restaurante
Ajude a escolher opções mais equilibradas ao comer fora: pratos, acompanhamentos, bebidas e porções.
- Sugira alternativas, não proibições absolutas.
- Pergunte contexto (tipo de restaurante, restrições) se faltar informação.`,
    swap: `## Modo: Substituir alimento
Sugira trocas equivalentes em sabor/uso (ex.: arroz, leite, snack).
- Explique por que a troca faz sentido nutricionalmente de forma simples.
- Busque conteúdos na Biblioteca quando ajudar.`,
    goal: `## Modo: Meta semanal
Foque em check-ins, humor, energia, aderência e evolução recente.
- Use get_checkin_summary para dados reais antes de responder.
- Celebre progresso e sugira 1–2 ajustes práticos para a semana.`,
  };

  return overlays[topic];
}
