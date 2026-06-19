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
- **Proibido** responder só com dicas genéricas de internet sem usar os dados desta paciente.
- Use SEMPRE os números do diário de hoje: meta, consumido e **restante** (kcal e macros).
- Esta saída substitui a refeição **{targetMealLabel}** do plano — compare APENAS com o prescrito dessa refeição (bloco abaixo), nunca com outra refeição do dia.
- **PROIBIDO** citar café da manhã, ovo, aveia ou itens de outras refeições quando a paciente fala de rodízio, restaurante, sushi, delivery ou comer fora — salvo se ela disser explicitamente que é café da manhã.
- Cite o que ela **já comeu hoje** (diário) ao estimar impacto e compensação.
- Use check-ins recentes para calibrar o tom.
- Estime kcal/macros da sugestão e diga o **impacto no saldo do dia**.
- Fale com {patientName} pelo nome.`;

export function buildRestaurantAdvisorPrompt(
  ctx: RestaurantAdvisorContext,
  intent?: RestaurantIntent,
): string {
  const intentBlock = intent ? `\n\n${buildRestaurantIntentModeBlock(intent)}` : "";
  const personalization = RESTAURANT_PERSONALIZATION_RULES
    .replace(/\{targetMealLabel\}/g, ctx.targetMealSlot.mealLabel)
    .replace(/\{patientName\}/g, ctx.patientName);

  const planSection = ctx.hasMealPlan
    ? ctx.mealPlanText
    : `${ctx.mealPlanText}\n\nUse as metas do diário abaixo como referência principal de objetivo.`;

  return `## Contexto individual de ${ctx.patientName} (banco de dados — use APENAS isto)
Plano do app: ${ctx.appPlan}

### Refeição que esta saída substitui no plano
**${ctx.targetMealSlot.mealLabel}** (${ctx.slotReason})

Prescrito para **${ctx.targetMealSlot.mealLabel}** (use só isto para cruzar com o cardápio):
${ctx.targetPrescribedMealText}

### Plano alimentar completo (referência — não cite outras refeições na resposta)
${planSection}

### Objetivo nutricional de hoje (diário)
${ctx.dailyDiaryText}

### O que já comeu hoje
${ctx.todayEntriesText}

### Evolução e check-ins recentes
${ctx.checkInSummary}

${personalization}

## Como recomendar (OBRIGATÓRIO)
1. Trate rodízio/restaurante/delivery como **${ctx.targetMealSlot.mealLabel}** do dia — não como café da manhã, salvo indicação explícita da paciente.
2. Cruze o cardápio com o prescrito de **${ctx.targetMealSlot.mealLabel}** e com o **saldo calórico restante** do dia.
3. Se ela já passou da meta (restante zero ou negativo), seja transparente e foque em **menor impacto possível** + compensação prática.
4. O cardápio nem sempre será ideal: ofereça adaptações práticas (porção, evitar fritura, molho à parte).
5. Funciona com foto de cardápio, lista de opções ou pergunta sobre comer fora.

${RESTAURANT_CUISINE_GUIDE}
${intentBlock}

## Formato da resposta (markdown)
## Seu momento agora
Contexto da saída (tipo de restaurante) e o que ela perguntou — **sem mencionar café da manhã** se for rodízio/almoço/jantar fora

## Seu plano e meta de hoje
Cite o prescrito de **${ctx.targetMealSlot.mealLabel}** + números do diário (meta, consumido, **restante**)

## Recomendação personalizada
Escolha concreta no cardápio real, porção e montagem — com estimativa de kcal/macros

## Impacto no seu dia
Quanto isso consome do saldo de hoje

## Como compensar (se precisar)
Ajustes práticos nas outras refeições ou no dia seguinte

## Resumo
2 frases práticas para ela decidir agora`;
}
