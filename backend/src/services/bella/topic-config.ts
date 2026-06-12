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
  dailyDiaryToolDefinition,
  mealPlanToolDefinition,
} from "./tools/meal-plan.tool";
import {
  userProfileToolDefinition,
} from "./tools/user-profile.tool";
import { BELLA_TOPICS, normalizeTopic, type BellaChatTopic } from "./topics";

export { BELLA_TOPICS, normalizeTopic, type BellaChatTopic };

export interface TopicScopeDefinition {
  title: string;
  focus: string;
  forbidden: string;
  greetingGuide: string;
  redirectHint: string;
}

export const TOPIC_SCOPES: Record<BellaChatTopic, TopicScopeDefinition> = {
  general: {
    title: "Conversa geral",
    focus: "dúvidas gerais de nutrição, hábitos, hidratação, sono e uso do app",
    forbidden: "análise detalhada de rótulos, estimativa de pratos, escolhas em restaurante, substituições específicas ou revisão de metas semanais (cada um tem chat próprio)",
    greetingGuide: "Cumprimente e pergunte como pode ajudar com nutrição e hábitos no dia a dia",
    redirectHint: "Se a dúvida for muito específica de rótulo, prato, restaurante, troca ou meta, sugira o atalho correspondente no app",
  },
  ask: {
    title: "Fazer pergunta",
    focus: "responder uma dúvida objetiva de nutrição ou hábitos com clareza",
    forbidden: "análise de rótulo/prato, cardápio de restaurante, substituições detalhadas ou metas semanais",
    greetingGuide: "Cumprimente brevemente e convide o paciente a fazer a pergunta",
    redirectHint: "Para rótulo use Ler rótulo; para prato use Meu prato; para restaurante, substituir ou meta use o atalho específico",
  },
  label: {
    title: "Ler rótulo",
    focus: "rótulos, tabelas nutricionais, ingredientes, porções e comparação prática de produtos embalados",
    forbidden: "análise de pratos montados, metas semanais, cardápios de restaurante, substituições genéricas ou conversa geral de nutrição",
    greetingGuide: "Cumprimente e diga que está pronta para analisar rótulos: peça foto pelo clipe ou a dúvida sobre o produto",
    redirectHint: "Se quiser analisar um prato, use o chat Meu prato; para restaurante ou substituições, use o atalho correto. Para dúvidas gerais de nutrição, redirecione com [[chat:ask|Fazer pergunta]]",
  },
  meal: {
    title: "Meu prato",
    focus: "identificar alimentos em fotos, estimar gramas/calorias/macros e registrar no diário alimentar de hoje após confirmação",
    forbidden: "rótulos de produtos industrializados, metas semanais, cardápios de restaurante, substituições genéricas ou conversa geral",
    greetingGuide: "Cumprimente, explique que a foto será analisada item a item e registrada no diário após confirmação, e peça foto de cima com boa luz",
    redirectHint: "Para rótulo use Ler rótulo; para comer fora use Restaurante",
  },
  restaurant: {
    title: "Restaurante",
    focus: "sugerir a melhor opção ao comer fora com base no cardápio/foto/opções da paciente, alinhada ao plano alimentar e ao diário de hoje, incluindo culinárias tradicionais",
    forbidden: "análise de rótulos de supermercado, registro no diário de prato caseiro, metas semanais ou substituições domésticas",
    greetingGuide: "Cumprimente e peça foto do cardápio ou a lista de pratos que ela está em dúvida; pergunte o tipo de restaurante se não souber",
    redirectHint: "Para registrar prato caseiro use Meu prato; para rótulo use Ler rótulo",
  },
  swap: {
    title: "Substituir alimento",
    focus: "sugerir trocas equivalentes (sabor, uso na cozinha, perfil nutricional) para um alimento específico",
    forbidden: "análise de rótulos, fotos de pratos completos, metas semanais ou escolhas em restaurante",
    greetingGuide: "Cumprimente e pergunte qual alimento quer substituir e por quê (restrição, objetivo ou preferência)",
    redirectHint: "Para analisar embalagem use Ler rótulo; para prato fotografado use Meu prato",
  },
  goal: {
    title: "Meta semanal",
    focus: "check-ins, humor, energia, aderência, evolução recente e metas da semana",
    forbidden: "rótulos, pratos, restaurantes, substituições de ingredientes ou dúvidas gerais sem relação com progresso",
    greetingGuide: "Cumprimente e pergunte o que quer saber sobre a meta ou evolução da semana",
    redirectHint: "Para dúvidas de produto ou refeição use os chats Ler rótulo ou Meu prato",
  },
};

const ALL_TOOLS: OpenAIToolDefinition[] = [
  checkinToolDefinition,
  coursesToolDefinition,
  userProfileToolDefinition,
  contentSearchToolDefinition,
  mealPlanToolDefinition,
  dailyDiaryToolDefinition,
];

const TOOLS_BY_TOPIC: Record<BellaChatTopic, BellaToolName[]> = {
  general: [
    "get_user_profile",
    "get_checkin_summary",
    "get_patient_meal_plan",
    "get_daily_diary_summary",
    "list_recommended_courses",
    "search_educational_content",
  ],
  ask: [
    "get_user_profile",
    "get_checkin_summary",
    "get_patient_meal_plan",
    "get_daily_diary_summary",
    "list_recommended_courses",
    "search_educational_content",
  ],
  label: ["search_educational_content"],
  meal: ["search_educational_content", "get_daily_diary_summary"],
  restaurant: ["get_patient_meal_plan", "get_daily_diary_summary", "search_educational_content", "get_user_profile"],
  swap: ["search_educational_content", "get_user_profile"],
  goal: ["get_checkin_summary", "get_user_profile", "list_recommended_courses"],
};

export function getToolsForTopic(topic: BellaChatTopic): OpenAIToolDefinition[] {
  const allowed = new Set(TOOLS_BY_TOPIC[topic]);
  return ALL_TOOLS.filter((tool) => allowed.has(tool.function.name));
}

export function getTopicTaskHint(topic: BellaChatTopic): string | undefined {
  if (topic === "label") return "label";
  if (topic === "meal") return "meal";
  return undefined;
}

export function getTopicScopeRules(topic: BellaChatTopic): string {
  const scope = TOPIC_SCOPES[topic];
  return `## Escopo OBRIGATÓRIO — ${scope.title}
Você está EXCLUSIVAMENTE no chat "${scope.title}". Sua especialidade aqui é: ${scope.focus}.

Regras de escopo (nunca quebre):
- Responda SOMENTE dentro deste foco, mesmo se o paciente disser apenas "oi", "olá" ou "obrigada".
- NUNCA responda sobre: ${scope.forbidden}.
- Se a pergunta for genérica ou cumprimento: ${scope.greetingGuide}.
- Se pedirem algo fora deste chat: explique com gentileza que aqui você cuida só de ${scope.focus.toLowerCase()}. ${scope.redirectHint}.
- Não misture modos. Não use estrutura ou conteúdo de outro chat.`;
}

export function getTopicOverlay(topic: BellaChatTopic): string {
  const overlays: Record<BellaChatTopic, string> = {
    general: `## Modo: Conversa geral
Ajude com dúvidas de nutrição, hábitos e uso do app.
- Em perguntas sobre alimentos ou refeições, personalize com plano prescrito, momento do dia e saldo restante do diário.`,
    ask: `## Modo: Fazer pergunta
Responda de forma direta e organizada. Use ferramentas quando precisar de dados atualizados do paciente ou da Biblioteca.
- Em perguntas sobre alimentos, dieta, calorias ou como encaixar algo no dia: cite plano prescrito, refeição atual, meta/consumido/restante e o que já comeu hoje.
- Nunca responda só com dicas genéricas sem usar os dados desta paciente.`,
    label: `## Modo: Ler rótulo
Foco exclusivo em classificar o consumo do produto (Verde, Amarelo ou Vermelho).
- Use a memória verificada desta paciente. Nunca confunda com outra pessoa.
- 🟢 Verde: liberado para consumo regular.
- 🟡 Amarelo: moderar a frequência ou porção.
- 🔴 Vermelho: evitar ou consumir raramente.
- Se ainda não enviou foto, peça imagem nítida do rótulo pelo clipe.
- Responda APENAS com a seção ## Classificação do consumo (Por quê + Sugestão). Sem Produto, Ingredientes ou "Semáforo".
- Se classificar 🔴 Vermelho, inclua **Alternativa melhor** com opção 🟢 ou 🟡 do mesmo tipo de alimento.`,
    meal: `## Modo: Foto do prato + diário
Fluxo obrigatório:
1. Paciente envia foto → você estima CADA item (gramas, kcal, C/P/G).
2. Paciente confirma no modal → refeição vai para o diário alimentar de hoje.
3. Se só texto, oriente a enviar foto ou use get_daily_diary_summary para contexto do dia.
- Preencha todos os campos nutricionais de cada item com coerência.
- Use get_daily_diary_summary quando precisar da meta/restante do dia.`,
    restaurant: `## Modo: Restaurante + plano alimentar
Foco exclusivo em escolher ao comer fora (restaurante, delivery, açaí, lanche, programas sociais).
- Aceita foto de cardápio OU lista de pratos OU pergunta sobre comer fora.
- Antes de analisar, a paciente escolhe se quer **encaixar no plano** ou **refeição livre** (já informado no contexto quando houver).
- **Obrigatório** usar plano prescrito, refeição atual, diário de hoje e o que já comeu. Proibido dicas genéricas sem números.
- Use get_patient_meal_plan e get_daily_diary_summary se precisar atualizar dados.
- Cardápios reais nem sempre têm opções ideais: seja transparente e ofereça adaptações ou flexibilidade conforme a intenção.
- Formato: Seu momento → Plano e meta → Recomendação personalizada → Impacto no dia → Como compensar → Resumo.`,
    swap: `## Modo: Substituir alimento
Fluxo guiado por botões (refeição → alimento → opções equivalentes).
- Use o plano alimentar prescrito e a base TACO/TBCA.
- Calcule porções equivalentes em kcal, carboidratos, proteínas e gorduras.
- Permita trocas dentro do mesmo **grupo nutricional**: carboidratos (cereais, tubérculos, leguminosas), proteínas, gorduras, frutas, verduras, laticínios.
- Nunca sugira trocar fruta por peixe ou grupos claramente diferentes.`,
    goal: `## Modo: Meta semanal
Foco exclusivo em check-ins, humor, energia, aderência e evolução recente.
- Use get_checkin_summary para dados reais antes de responder.
- Celebre progresso e sugira 1–2 ajustes práticos para a semana.`,
  };

  return `${overlays[topic]}\n\n${getTopicScopeRules(topic)}`;
}

/** Resposta local quando a IA está offline — mantém o escopo do tópico. */
export function getTopicOfflineReply(topic: BellaChatTopic, firstName: string): string {
  const scope = TOPIC_SCOPES[topic];
  const guides: Record<BellaChatTopic, string> = {
    general: `${firstName}, posso te ajudar com hábitos, hidratação e bem-estar geral. Como posso te apoiar?`,
    ask: `${firstName}, pode fazer sua pergunta sobre nutrição ou hábitos. Estou pronta para responder.`,
    label: `${firstName}, envie a foto do rótulo pelo clipe. Classifico o consumo: 🟢 liberado, 🟡 moderar ou 🔴 evitar frequente.`,
    meal: `${firstName}, envie a foto do prato de cima, com boa luz. Estimo gramas, calorias e macros de cada item; você confirma e registro no diário de hoje.`,
    restaurant: `${firstName}, mande foto do cardápio ou as opções que você está em dúvida. Sugiro a melhor escolha alinhada ao seu plano alimentar e ao que falta no diário de hoje.`,
    swap: `${firstName}, qual alimento você quer substituir? Me diga o que costuma usar e seu objetivo.`,
    goal: `${firstName}, posso olhar sua evolução nos check-ins. O que você quer saber sobre sua meta da semana?`,
  };
  return `Olá, ${firstName}! Sou a BELLA. Neste chat cuido de ${scope.focus.toLowerCase()}. ${guides[topic]}`;
}

export function isLikelyGreeting(message: string): boolean {
  const text = message.trim().toLowerCase().replace(/[!?.]+$/g, "");
  return /^(oi|olá|ola|hey|hi|hello|bom dia|boa tarde|boa noite|e aí|e ai|tudo bem|obrigad[oa]|valeu|ok|okay)$/.test(text)
    || /^(oi|olá|ola)\s+(bella|bela)?$/.test(text);
}
