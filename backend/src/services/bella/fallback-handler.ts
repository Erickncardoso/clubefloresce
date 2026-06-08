import type { BellaToolName } from "./types";
import { executeTool } from "./tools";

interface FallbackPlan {
  tools: BellaToolName[];
  toolArgs: Partial<Record<BellaToolName, Record<string, unknown>>>;
  intro: string;
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

export async function generateFallbackReply(
  userId: string,
  message: string,
  firstName: string,
): Promise<{ reply: string; toolsUsed: BellaToolName[] }> {
  const plan = detectFallbackPlan(message);
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
        "Se quiser orientação personalizada de plano alimentar, combine com sua nutricionista. Posso ajudar com mais alguma dúvida?",
      toolsUsed,
    };
  }

  if (/fome|belisc|ansiedade/i.test(message.toLowerCase())) {
    return {
      reply:
        `${firstName}, isso é bem comum no processo. Observe se as refeições principais estão equilibradas ` +
        "e se há intervalos longos entre elas. Anotar o que sente antes de beliscar (fome, tédio ou ansiedade) " +
        "ajuda muito na consulta com sua nutricionista.",
      toolsUsed: [],
    };
  }

  return {
    reply:
      `Olá, ${firstName}! Sou a BELLA, sua parceira no Clube Florescer. ` +
      "Posso te ajudar com hábitos, check-in, conteúdos da Biblioteca e bem-estar geral. " +
      "Lembre-se: orientações personalizadas de plano alimentar vêm da sua nutricionista. Como posso te apoiar hoje?",
    toolsUsed: [],
  };
}
