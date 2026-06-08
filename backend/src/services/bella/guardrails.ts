import type { GuardrailResult } from "./types";

const MEDICAL_EMERGENCY_PATTERNS = [
  /infarto|avc|derrame|desmaio|desmaiando|n[aã]o consigo respirar|falta de ar severa/,
  /sangramento intenso|sangue em abund[aâ]ncia|convuls[aã]o|convulsionando/,
  /dor no peito|peito muito dolorido|emerg[eê]ncia m[eé]dica|192|193|190/,
];

const SELF_HARM_PATTERNS = [
  /quero me matar|vou me matar|suic[ií]dio|me machucar|autoles[aã]o|n[aã]o quero (mais )?viver/,
];

const ABUSE_PATTERNS = [
  /\b(vai se foder|filho da puta|fdp|caralho)\b/i,
];

const MEDICAL_EMERGENCY_RESPONSE =
  "Sinto muito que você esteja passando por isso. Situações como essa precisam de atendimento médico imediato. " +
  "Ligue agora para o SAMU (192) ou vá ao pronto-socorro mais próximo. " +
  "Estou aqui para apoiar em hábitos e bem-estar, mas não substituo cuidado de emergência.";

const SELF_HARM_RESPONSE =
  "Obrigada por confiar em mim. O que você compartilhou é importante e você não precisa enfrentar isso sozinho(a). " +
  "Converse com alguém de confiança agora e busque ajuda profissional: CVV 188 (24h) ou atendimento de saúde mental. " +
  "Sua nutricionista e equipe de cuidado também podem apoiar quando você estiver seguro(a).";

export function runInputGuardrails(message: string): GuardrailResult {
  const text = message.trim();
  if (!text) return { blocked: false };

  if (MEDICAL_EMERGENCY_PATTERNS.some((p) => p.test(text))) {
    return { blocked: true, reason: "medical_emergency", response: MEDICAL_EMERGENCY_RESPONSE };
  }

  if (SELF_HARM_PATTERNS.some((p) => p.test(text))) {
    return { blocked: true, reason: "self_harm", response: SELF_HARM_RESPONSE };
  }

  if (ABUSE_PATTERNS.some((p) => p.test(text))) {
    return {
      blocked: true,
      reason: "abuse",
      response:
        "Prefiro manter nossa conversa respeitosa para eu poder te ajudar de verdade. " +
        "Quando quiser, me conte como posso apoiar sua rotina alimentar ou bem-estar.",
    };
  }

  return { blocked: false };
}

export function sanitizeOutput(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\s—\s/g, ", ")
    .replace(/\s--\s/g, ", ")
    .trim();
}
