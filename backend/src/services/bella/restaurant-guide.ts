import type { RestaurantAdvisorContext } from "./meal-plan-context";

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

export function buildRestaurantAdvisorPrompt(ctx: RestaurantAdvisorContext): string {
  return `## Contexto da paciente para esta refeição fora
Refeição provável agora: **${ctx.currentMealSlot.mealLabel}**

### Plano alimentar
${ctx.mealPlanText}

### Diário de hoje
${ctx.dailyDiaryText}

## Como recomendar (OBRIGATÓRIO)
1. Cruze cardápio/opções da paciente com a refeição equivalente do plano (${ctx.currentMealSlot.mealLabel}).
2. Respeite o saldo calórico restante do dia ao sugerir porções.
3. Se houver plano cadastrado, diga explicitamente como a escolha se aproxima ou complementa o prescrito.
4. Se não houver plano, sugira opções saudáveis gerais e lembre de alinhar com a nutricionista.
5. Não proíba: sugira a **melhor opção possível** dentro do cardápio real.
6. Funciona com foto de cardápio OU lista de opções que a paciente quer comer.

${RESTAURANT_CUISINE_GUIDE}

## Formato da resposta (markdown)
## Contexto
Tipo de restaurante/culinária e o que a paciente enviou

## Melhor opção no cardápio
A escolha principal, alinhada ao plano e ao diário de hoje, com justificativa

## Alternativas boas
- Opção 2
- Opção 3 (se couber)

## Como montar o prato
Proteína, carboidrato, vegetais, molhos/bebidas e porção

## Alinhamento com seu plano
Como isso conversa com ${ctx.currentMealSlot.mealLabel} do plano (ou orientação geral se não houver plano)

## Resumo
2 frases práticas para pedir agora`;
}
