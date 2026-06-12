export type RestaurantIntent = "plan_fit" | "free_meal";

export const RESTAURANT_INTENT_LABELS: Record<RestaurantIntent, string> = {
  plan_fit: "Encaixar no plano alimentar",
  free_meal: "Refeição livre",
};

export function normalizeRestaurantIntent(raw?: string | null): RestaurantIntent | null {
  if (raw === "plan_fit" || raw === "free_meal") return raw;
  return null;
}

const PLAN_FIT_MESSAGE =
  /encaix(?:ar|e|ando|ar na|ar no|ar dentro)|(?:como|onde|d[aá] para) (?:encaix|cab(?:er|e))(?:ar|e)? (?:na dieta|no plano|na alimenta[cç][aã]o)|dentro do plano|no plano alimentar|(?:na|à|a) dieta|manter (?:a )?(?:dieta|plano)|alinhad[oa] (?:ao|com|com o|com a) (?:plano|dieta)|(?:sem|n[aã]o) sair (?:muito )?do plano|compensar (?:no|na|depois|na refei[cç][aã]o)/i;

const FREE_MEAL_MESSAGE =
  /refei[cç][aã]o livre|quero liberar|vou liberar|cheat meal|cheat day|sem culpa|aproveitar (?:o|a|sem|meu|minha)|n[aã]o quero me preocupar|mais flex[ií]vel|com flexibilidade|relaxar (?:com|na) (?:a )?(?:refei[cç][aã]o|comida)/i;

/** Detecta intenção já declarada na mensagem da paciente. */
export function detectRestaurantIntentFromMessage(message: string): RestaurantIntent | null {
  const text = message.trim();
  if (!text) return null;

  const planFit = PLAN_FIT_MESSAGE.test(text);
  const freeMeal = FREE_MEAL_MESSAGE.test(text);

  if (planFit && !freeMeal) return "plan_fit";
  if (freeMeal && !planFit) return "free_meal";
  if (planFit) return "plan_fit";
  if (freeMeal) return "free_meal";
  return null;
}

export function buildRestaurantIntentModeBlock(intent: RestaurantIntent): string {
  if (intent === "plan_fit") {
    return `## Intenção da paciente: ENCAIXAR NO PLANO
A paciente quer aproveitar o restaurante **mantendo o máximo de alinhamento** com o plano alimentar e o saldo calórico do dia.

Como responder:
- Priorize a **melhor opção possível no cardápio real**, mesmo que não seja perfeita.
- Se o cardápio não tiver opções ideais, sugira **adaptações práticas** (trocar acompanhamento, pedir molho à parte, reduzir porção, substituir fritura).
- Cruze com a refeição equivalente do plano e com o que falta no diário de hoje.
- Seja honesta quando nenhuma opção for boa: explique o **menor desvio possível** e como compensar depois.
- Tom: parceira, objetiva, sem proibir.`;
  }

  return `## Intenção da paciente: REFEIÇÃO LIVRE
A paciente quer **aproveitar a refeição fora** com mais flexibilidade, sem foco rígido em encaixar no plano.

Como responder:
- Ofereça sugestões **mais flexíveis e prazerosas**, adequadas ao cardápio real (não apenas "a opção mais fit").
- Ainda traga orientação prática de montagem do prato, bebida e porção.
- **Deixe claro o impacto** no progresso: calorias extras, menor aderência ao plano, possível atraso na meta, retenção, etc.
- Sugira **1–2 formas de compensar depois** (sem culpa, sem proibir): refeição seguinte mais leve, hidratação, caminhada, retomar plano no dia seguinte.
- Não seja rígida nem punitiva. Valide a escolha social/delivery e ajude a decidir com consciência.
- Se o cardápio não tiver boas opções "fit", não force encaixe no plano: foque em escolhas **conscientes dentro da flexibilidade**.`;
}

export const RESTAURANT_INTENT_QUESTION =
  "Recebi! Antes de analisar, me conta qual é a sua intenção para esta refeição?\n\n" +
  "Escolha uma opção abaixo para eu montar a orientação certa para você.";
