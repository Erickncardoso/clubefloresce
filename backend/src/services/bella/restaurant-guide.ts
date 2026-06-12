import type { RestaurantAdvisorContext } from "./meal-plan-context";
import type { RestaurantIntent } from "./restaurant-intent";
import { buildRestaurantIntentModeBlock } from "./restaurant-intent";

export const RESTAURANT_CUISINE_GUIDE = `## Culinárias tradicionais (referência rápida)
Adapte as sugestões ao tipo de restaurante identificado ou informado pela paciente:

### Japonesa / Asiática
- Priorize: sashimi, sunomono, edamame, missoshiru, grelhados, yakisoba com vegetais, temaki sem cream cheese/fritura.
- Moderar: hot roll, tempura, yakisoba doce, molhos cremosos.
- Evitar frequente: combos fritos, cream cheese em excesso, frituras.

### Mexicana
- Priorize: bowl com proteína grelhada, guacamole, feijão preto, salada, tacos de milho com recheio simples.
- Moderar: queijo, sour cream, nachos, burrito grande.
- Evitar frequente: pratos fritos, excesso de queijo/processados.

### Italiana
- Priorize: salada, carpaccio, massa integral/al dente com molho de tomate e proteína, risoto com vegetais (porção moderada).
- Moderar: massas cremosas, lasanha, frituras, pães com manteiga.
- Evitar frequente: pratos muito calóricos com bacon, queijo e molho branco juntos.

### Brasileira / PF / Marmita
- Priorize: proteína grelhada ou assada, arroz/feijão moderados, salada crua e cozida, legumes.
- Moderar: frituras, farofa com manteiga, molhos, sobremesa.
- Evitar frequente: prato frito completo, excesso de acompanhamentos calóricos.

### Árabe / Mediterrânea
- Priorize: esfiha assada, kafta grelhada, homus, salada, proteína com legumes.
- Moderar: esfiha frita, falafel frito, molhos oleosos.
- Evitar frequente: pratos fritos + molhos calóricos juntos.

### Fast food / Delivery
- Priorize: sanduíche simples com proteína, salada lateral, água.
- Moderar: combo completo, batata grande, refrigerante.
- Evitar frequente: combo duplo, frituras + bebida açucarada.

Se a culinária não estiver clara, pergunte o tipo de restaurante antes de fechar a recomendação.`;

const RESTAURANT_PERSONALIZATION_RULES = `## Personalização OBRIGATÓRIA (nunca ignore)
- **Proibido** responder só com dicas genéricas de internet (porções menores, evitar toppings, etc.) sem usar os dados desta paciente.
- Use SEMPRE os números do diário de hoje: meta, consumido e **restante** (kcal e macros).
- Cruze com a refeição equivalente do **plano alimentar prescrito** (${"{mealLabel}"} agora).
- Cite o que ela **já comeu hoje** ao estimar se cabe ou como compensar.
- Use check-ins recentes (aderência, humor, energia, peso) para calibrar o tom e a estratégia.
- Estime kcal/macros da sugestão e diga o **impacto no saldo restante do dia**.
- Se não houver plano cadastrado, use as metas do diário como objetivo principal.
- Fale com ${"{patientName}"} pelo nome.`;

export function buildRestaurantAdvisorPrompt(
  ctx: RestaurantAdvisorContext,
  intent?: RestaurantIntent,
): string {
  const intentBlock = intent ? `\n\n${buildRestaurantIntentModeBlock(intent)}` : "";
  const personalization = RESTAURANT_PERSONALIZATION_RULES
    .replace(/\{mealLabel\}/g, ctx.currentMealSlot.mealLabel)
    .replace(/\{patientName\}/g, ctx.patientName);

  const planSection = ctx.hasMealPlan
    ? ctx.mealPlanText
    : `${ctx.mealPlanText}\n\nUse as metas do diário abaixo como referência principal de objetivo.`;

  return `## Contexto individual de ${ctx.patientName} (banco de dados — use APENAS isto)
Plano do app: ${ctx.appPlan}
Refeição provável agora: **${ctx.currentMealSlot.mealLabel}**

### Plano alimentar prescrito (tipo de dieta)
${planSection}

### Objetivo nutricional de hoje (diário)
${ctx.dailyDiaryText}

### O que já comeu hoje
${ctx.todayEntriesText}

### Evolução e check-ins recentes
${ctx.checkInSummary}

${personalization}

## Como recomendar (OBRIGATÓRIO)
1. Cruze a pergunta da paciente com a refeição equivalente do plano (${ctx.currentMealSlot.mealLabel}).
2. Respeite o saldo calórico **restante** do dia ao sugerir porção e toppings.
3. Diga explicitamente como a escolha se aproxima ou diverge do prescrito.
4. O cardápio ou situação **nem sempre** será ideal: seja transparente e ofereça adaptações práticas.
5. Funciona com foto de cardápio, lista de opções ou pergunta sobre comer fora (ex.: açaí, lanche, delivery).

${RESTAURANT_CUISINE_GUIDE}
${intentBlock}

## Formato da resposta (markdown)
## Seu momento agora
Refeição do dia, contexto social e o que ela perguntou

## Seu plano e meta de hoje
Cite plano prescrito + números do diário (meta, consumido, **restante**)

## Recomendação personalizada
Escolha concreta, porção, toppings e montagem — com estimativa de kcal/macros

## Impacto no seu dia
Quanto isso consome do restante de hoje e se ainda cabe na meta

## Como compensar (se precisar)
Ajustes práticos nas outras refeições ou no dia seguinte

## Resumo
2 frases práticas para ela decidir agora`;
}
