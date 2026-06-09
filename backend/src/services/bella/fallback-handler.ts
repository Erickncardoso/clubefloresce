import type { BellaToolName } from "./types";
import { executeTool } from "./tools";
import {
  getTopicOfflineReply,
  isLikelyGreeting,
  normalizeTopic,
  type BellaChatTopic,
} from "./topic-config";

interface FallbackPlan {
  tools: BellaToolName[];
  toolArgs: Partial<Record<BellaToolName, Record<string, unknown>>>;
  intro: string;
}

const TOOLS_BY_TOPIC: Record<BellaChatTopic, BellaToolName[]> = {
  general: ["get_user_profile", "get_checkin_summary", "list_recommended_courses", "search_educational_content"],
  ask: ["get_user_profile", "get_checkin_summary", "list_recommended_courses", "search_educational_content"],
  label: ["search_educational_content"],
  meal: ["search_educational_content", "get_daily_diary_summary"],
  restaurant: ["get_patient_meal_plan", "get_daily_diary_summary", "search_educational_content", "get_user_profile"],
  swap: ["search_educational_content", "get_user_profile"],
  goal: ["get_checkin_summary", "get_user_profile", "list_recommended_courses"],
};

function allowedTools(topic: BellaChatTopic): Set<BellaToolName> {
  return new Set(TOOLS_BY_TOPIC[topic]);
}

function filterPlan(plan: FallbackPlan, topic: BellaChatTopic): FallbackPlan {
  const allowed = allowedTools(topic);
  const tools = plan.tools.filter((t) => allowed.has(t));
  return { ...plan, tools };
}

function detectTopicFallbackPlan(message: string, topic: BellaChatTopic): FallbackPlan {
  const lower = message.toLowerCase();

  if (topic === "goal") {
    if (/check.?in|humor|energia|ader[eê]ncia|peso|evolu|meta|semana/i.test(lower)) {
      return {
        tools: ["get_checkin_summary"],
        toolArgs: { get_checkin_summary: { weeks: 4 } },
        intro: "Consultei seus check-ins recentes:",
      };
    }
    return {
      tools: ["get_checkin_summary"],
      toolArgs: { get_checkin_summary: { weeks: 2 } },
      intro: "Veja sua evolução recente:",
    };
  }

  if (topic === "label") {
    const query = /ingrediente|açúcar|acucar|sódio|sodio|gordura|fibra|tabela|rotulo|rótulo/i.test(lower)
      ? extractSearchQuery(message)
      : "ler rótulo alimentos";
    return {
      tools: ["search_educational_content"],
      toolArgs: { search_educational_content: { query, limit: 3 } },
      intro: "Conteúdos sobre rótulos e tabelas nutricionais:",
    };
  }

  if (topic === "meal") {
    const query = /caloria|macro|prote[ií]na|carbo|por[cç][aã]o|prato|refei/i.test(lower)
      ? extractSearchQuery(message)
      : "montar prato equilibrado";
    return {
      tools: ["search_educational_content"],
      toolArgs: { search_educational_content: { query, limit: 3 } },
      intro: "Conteúdos sobre refeições e equilíbrio no prato:",
    };
  }

  if (topic === "restaurant") {
    const query = /restaurante|card[aá]pio|fora|delivery|fast food/i.test(lower)
      ? extractSearchQuery(message)
      : "comer fora restaurante";
    return {
      tools: ["search_educational_content"],
      toolArgs: { search_educational_content: { query, limit: 3 } },
      intro: "Dicas para escolhas ao comer fora:",
    };
  }

  if (topic === "swap") {
    const query = extractSearchQuery(message);
    return {
      tools: ["search_educational_content"],
      toolArgs: { search_educational_content: { query: query || "substituir alimentos", limit: 3 } },
      intro: "Ideias de substituições:",
    };
  }

  return { tools: [], toolArgs: {}, intro: "" };
}

function detectFallbackPlan(message: string): FallbackPlan {
  const lower = message.toLowerCase();

  if (/check.?in|humor|energia|ader[eê]ncia|peso|evolu/i.test(lower)) {
    return {
      tools: ["get_checkin_summary"],
      toolArgs: { get_checkin_summary: { weeks: 4 } },
      intro: "Consultei seus check-ins recentes:",
    };
  }

  if (/curso|aula|biblioteca|aprender|v[ií]deo|m[oó]dulo/i.test(lower)) {
    return {
      tools: ["list_recommended_courses"],
      toolArgs: { list_recommended_courses: { limit: 5 } },
      intro: "Estes conteúdos estão disponíveis na Biblioteca:",
    };
  }

  if (/ebook|material|receita|prote[ií]na|carbo|metabol|hidrata|sono|lanche|dieta|refei/i.test(lower)) {
    const query = extractSearchQuery(message);
    return {
      tools: ["search_educational_content"],
      toolArgs: { search_educational_content: { query, limit: 5 } },
      intro: `Busquei conteúdos sobre "${query}":`,
    };
  }

  if (/perfil|plano|membro|conta/i.test(lower)) {
    return {
      tools: ["get_user_profile"],
      toolArgs: {},
      intro: "Aqui estão seus dados na plataforma:",
    };
  }

  if (/água|agua|hidrata/i.test(lower)) {
    return {
      tools: ["search_educational_content"],
      toolArgs: { search_educational_content: { query: "hidratação", limit: 3 } },
      intro: "",
    };
  }

  return { tools: [], toolArgs: {}, intro: "" };
}

function extractSearchQuery(message: string): string {
  const cleaned = message
    .replace(/^(me fale sobre|quero saber sobre|busca|pesquisa|tem algo sobre)\s+/i, "")
    .trim();
  return cleaned.slice(0, 80) || "nutrição";
}

function topicScopedDefaultReply(topic: BellaChatTopic, firstName: string, message: string): string {
  if (topic === "label") {
    return `${firstName}, neste chat analiso rótulos com semáforo: 🟢 liberado, 🟡 moderar ou 🔴 evitar frequente. Envie a foto do rótulo (ingredientes + tabela) ou descreva o produto.`;
  }
  if (topic === "meal") {
    return `${firstName}, neste chat você envia a foto do prato, confirma os itens e registro tudo no diário de hoje com calorias e macros.`;
  }
  if (topic === "restaurant") {
    return `${firstName}, neste chat ajudo a escolher a melhor opção no restaurante, alinhada ao seu plano alimentar. Mande foto do cardápio ou as opções que você está em dúvida.`;
  }
  if (topic === "swap") {
    return `${firstName}, neste chat sugiro substituições para alimentos. Qual alimento você quer trocar e por quê?`;
  }
  if (topic === "goal") {
    return `${firstName}, neste chat acompanho sua meta e evolução. Quer saber sobre check-ins, humor, energia ou aderência da semana?`;
  }
  if (topic === "ask") {
    return `${firstName}, pode fazer sua pergunta sobre nutrição ou hábitos. Respondo de forma direta e clara.`;
  }

  if (/fome|belisc|ansiedade/i.test(message.toLowerCase())) {
    return (
      `${firstName}, isso é bem comum no processo. Observe se as refeições principais estão equilibradas ` +
      "e se há intervalos longos entre elas. Anotar o que sente antes de beliscar (fome, tédio ou ansiedade) " +
      "ajuda muito na consulta com sua nutricionista."
    );
  }

  return getTopicOfflineReply(topic, firstName);
}

export async function generateFallbackReply(
  userId: string,
  message: string,
  firstName: string,
  topicInput?: string | null,
): Promise<{ reply: string; toolsUsed: BellaToolName[] }> {
  const topic = normalizeTopic(topicInput);

  if (isLikelyGreeting(message)) {
    return { reply: getTopicOfflineReply(topic, firstName), toolsUsed: [] };
  }

  const topicPlan = filterPlan(detectTopicFallbackPlan(message, topic), topic);
  const generalPlan = filterPlan(detectFallbackPlan(message), topic);
  const plan = topicPlan.tools.length ? topicPlan : generalPlan;

  const ctx = { userId };
  const toolsUsed: BellaToolName[] = [];
  const sections: string[] = [];

  for (const tool of plan.tools) {
    const args = plan.toolArgs[tool] || {};
    const result = await executeTool(tool, args, ctx);
    toolsUsed.push(tool);
    if (plan.intro && sections.length === 0) {
      sections.push(plan.intro);
    }
    sections.push(result);
  }

  if (sections.length) {
    const body = sections.join("\n\n");
    return {
      reply:
        `${firstName}, encontrei isto para você:\n\n${body}\n\n` +
        "Se quiser orientação personalizada de plano alimentar, combine com sua nutricionista.",
      toolsUsed,
    };
  }

  return {
    reply: topicScopedDefaultReply(topic, firstName, message),
    toolsUsed: [],
  };
}
