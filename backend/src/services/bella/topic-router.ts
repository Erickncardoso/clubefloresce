import type { BellaChatTopic } from "./topics";
import { isLikelyGreeting } from "./topic-config";

export interface TopicRouteInfo {
  id: BellaChatTopic;
  title: string;
  path: string;
}

export const TOPIC_ROUTES: Record<BellaChatTopic, TopicRouteInfo> = {
  general: { id: "general", title: "Conversa geral", path: "/bella/chat/general" },
  ask: { id: "ask", title: "Fazer pergunta", path: "/bella/chat/ask" },
  label: { id: "label", title: "Ler rótulo", path: "/bella/chat/label" },
  meal: { id: "meal", title: "Meu prato", path: "/bella/chat/meal" },
  restaurant: { id: "restaurant", title: "Restaurante", path: "/bella/chat/restaurant" },
  swap: { id: "swap", title: "Substituir alimento", path: "/bella/chat/swap" },
  goal: { id: "goal", title: "Meta semanal", path: "/bella/chat/goal" },
};

const SPECIALIZED_TOPICS = new Set<BellaChatTopic>(["label", "meal", "restaurant", "swap", "goal"]);

const LABEL_SIGNALS =
  /rótulo|rotulo|tabela nutricional|lista de ingredientes|ingredientes|embalagem|industrializado|ultraprocessado|semáforo|semaforo|rótulos|rotulos|produto embalado|informação nutricional|informacao nutricional/i;
const MEAL_SIGNALS =
  /meu prato|foto do prato|prato montado|refeição|refeicao|registrar no diário|registrar no diario|diário alimentar|diario alimentar|calorias do prato|macros do prato|almoco|almoço|jantar|lanche|café da manhã|cafe da manha/i;
const RESTAURANT_SIGNALS =
  /restaurante|cardápio|cardapio|comer fora|delivery|ifood|fast food|sushi|pizza|hamburguer|hambúrguer/i;
const RESTAURANT_EATING_OUT_SIGNALS =
  /sair|encontro|amigas|amigos|programa|festa|balada|pedir|tomar|a[cç]a[ií]|sorvete|lanchonete|padaria|caf[eé]|bar\b|pub\b|food truck|marmita|self.?service|rod[ií]zio|buffet/i;
const SWAP_SIGNALS = /substituir|substituição|substituicao|trocar o |trocar por |no lugar de |alternativa para /i;
const GOAL_SIGNALS =
  /check.?in|meta semanal|ader[eê]ncia|humor|energia|evolução|evolucao|progresso da semana|peso esta semana/i;
const ASK_SIGNALS =
  /calor|prote[ií]na|carbo|gordura|nutri|dieta|engorda|emagrece|pode comer|faz mal|faz bem|saud[aá]vel|vitamina|mineral|receita|macarr[aã]o|arroz|feij[aã]o|frango|carne|leite|ovo|p[aã]o|açúcar|acucar|s[oó]dio|fibra|por[cç][aã]o|quantas calorias|quanto de /i;

const CONTINUATION_SIGNALS =
  /^(fale mais|continua|continuar|e da[ií]|explica mais|me conta mais|detalha|aprofunda|pode elaborar|e ent[aã]o|e agora|mais sobre)/i;

export function isMessageInTopicScope(topic: BellaChatTopic, message: string): boolean {
  const text = message.trim();
  if (!text) return false;

  if (topic === "label") {
    return (
      LABEL_SIGNALS.test(text) ||
      /foto|imagem|analise|analisa|embalagem|produto|industrializ|manda|enviei|mandei/i.test(text)
    );
  }
  if (topic === "meal") {
    return MEAL_SIGNALS.test(text) || /foto|imagem|prato|refei|di[aá]rio|registr/i.test(text);
  }
  if (topic === "restaurant") {
    if (RESTAURANT_SIGNALS.test(text) || RESTAURANT_EATING_OUT_SIGNALS.test(text)) return true;
    if (/encaixar|dieta|plano alimentar|refei[cç][aã]o livre|comer fora|card[aá]pio/i.test(text)) return true;
    return false;
  }
  if (topic === "swap") {
    return SWAP_SIGNALS.test(text) || /trocar|substitu/i.test(text);
  }
  if (topic === "goal") {
    return GOAL_SIGNALS.test(text);
  }
  return true;
}

function scoreTopic(message: string, pattern: RegExp): number {
  return pattern.test(message) ? 1 : 0;
}

const TOPIC_PRIORITY: BellaChatTopic[] = ["label", "meal", "restaurant", "swap", "goal", "ask", "general"];

function topicPriority(topic: BellaChatTopic): number {
  const index = TOPIC_PRIORITY.indexOf(topic);
  return index === -1 ? TOPIC_PRIORITY.length : index;
}

/** Melhor chat para a intenção detectada no texto (null = ambíguo). */
export function detectBestTopicForMessage(message: string): BellaChatTopic | null {
  const text = message.trim();
  if (!text || isLikelyGreeting(text)) return null;

  const scores: Record<BellaChatTopic, number> = {
    general: 0,
    ask: scoreTopic(text, ASK_SIGNALS),
    label: scoreTopic(text, LABEL_SIGNALS),
    meal: scoreTopic(text, MEAL_SIGNALS),
    restaurant:
      scoreTopic(text, RESTAURANT_SIGNALS) +
      scoreTopic(text, RESTAURANT_EATING_OUT_SIGNALS) +
      (/encaixar|comer fora|card[aá]pio|refei[cç][aã]o livre/i.test(text) ? 1 : 0),
    swap: scoreTopic(text, SWAP_SIGNALS),
    goal: scoreTopic(text, GOAL_SIGNALS),
  };

  const ranked = (Object.entries(scores) as [BellaChatTopic, number][])
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1] || topicPriority(a[0]) - topicPriority(b[0]));

  if (!ranked.length) {
    if (/\?/.test(text) || /^(quero saber|me fale|me explique|dúvida|duvida|como|qual|quanto|por que|porque)/i.test(text)) {
      return "ask";
    }
    return null;
  }

  return ranked[0][0];
}

export function buildTopicLink(topic: BellaChatTopic): string {
  const route = TOPIC_ROUTES[topic];
  return `[[chat:${route.id}|${route.title}]]`;
}

export function buildTopicRedirectReply(
  firstName: string,
  currentTopic: BellaChatTopic,
  targetTopic: BellaChatTopic,
  userMessage: string,
): string {
  const current = TOPIC_ROUTES[currentTopic];
  const target = TOPIC_ROUTES[targetTopic];
  const link = buildTopicLink(targetTopic);

  if (targetTopic === "ask") {
    return (
      `${firstName}, essa pergunta fica melhor no chat **${target.title}**, onde posso te explicar com calma sobre nutrição e hábitos.\n\n` +
      `Aqui no **${current.title}** cuido só de ${scopeShort(currentTopic)}.\n\n` +
      `Toque para continuar: ${link}`
    );
  }

  if (targetTopic === "label") {
    return (
      `${firstName}, para analisar embalagem ou tabela nutricional, use o chat **${target.title}** com foto do rótulo.\n\n` +
      `${link}`
    );
  }

  if (targetTopic === "meal") {
    return (
      `${firstName}, para registrar refeição com foto e calorias, abra **${target.title}**.\n\n` +
      `${link}`
    );
  }

  return (
    `${firstName}, esse assunto combina mais com **${target.title}** do que com **${current.title}**.\n\n` +
    `Toque para ir ao chat certo: ${link}`
  );
}

function scopeShort(topic: BellaChatTopic): string {
  const map: Record<BellaChatTopic, string> = {
    general: "conversa geral",
    ask: "perguntas de nutrição",
    label: "rótulos e tabelas nutricionais",
    meal: "fotos de prato e diário alimentar",
    restaurant: "escolhas ao comer fora",
    swap: "substituições de alimentos",
    goal: "meta e check-ins da semana",
  };
  return map[topic];
}

export interface TopicRedirectDecision {
  redirect: true;
  targetTopic: BellaChatTopic;
  reply: string;
}

/** Redireciona quando o chat especializado recebe assunto de outro modo. */
export function evaluateTopicRedirect(input: {
  topic: BellaChatTopic;
  message: string;
  firstName: string;
  hasAttachment?: boolean;
}): TopicRedirectDecision | null {
  const { topic, message, firstName, hasAttachment } = input;
  const text = message.trim();

  if (!text || hasAttachment) return null;
  if (!SPECIALIZED_TOPICS.has(topic)) return null;
  if (isLikelyGreeting(text)) return null;

  if (isMessageInTopicScope(topic, text)) return null;

  const best = detectBestTopicForMessage(text);
  const targetTopic: BellaChatTopic =
    best && best !== topic && best !== "general" ? best : "ask";

  if (CONTINUATION_SIGNALS.test(text) || !best) {
    return {
      redirect: true,
      targetTopic: "ask",
      reply: buildTopicRedirectReply(firstName, topic, "ask", text),
    };
  }

  if (targetTopic !== topic) {
    return {
      redirect: true,
      targetTopic,
      reply: buildTopicRedirectReply(firstName, topic, targetTopic, text),
    };
  }

  return null;
}

export function getTopicRedirectPromptBlock(): string {
  return `## Redirecionamento entre chats (OBRIGATÓRIO)
Quando a pergunta NÃO for do escopo deste chat, NÃO responda o conteúdo. Redirecione gentilmente com link no formato:
[[chat:ID|Texto do botão]]

IDs disponíveis: ask (Fazer pergunta), label (Ler rótulo), meal (Meu prato), restaurant (Restaurante), swap (Substituir alimento), goal (Meta semanal), general (Conversa geral).

Exemplo: "Para essa dúvida, use o chat certo: [[chat:ask|Fazer pergunta]]"`;
}
