import type { UserContextSnapshot } from "./types";
import type { BellaChatTopic } from "./topic-config";
import { getTopicOverlay, TOPIC_SCOPES } from "./topic-config";
import { getTopicRedirectPromptBlock } from "./topic-router";
import {
  buildLabelChatSemaphoreGuide,
  LABEL_ANALYSIS_SECTIONS,
  LABEL_SEMAPHORE_CRITERIA,
} from "./label-semaphore";
import { buildRestaurantAdvisorPrompt } from "./restaurant-guide";
import type { RestaurantAdvisorContext } from "./meal-plan-context";
import type { RestaurantIntent } from "./restaurant-intent";
import { BELLA_MEMORY_RULES, BELLA_PERSONALIZATION_RULES } from "./memory-rules";

export function buildSystemPrompt(ctx: UserContextSnapshot, conversationMemory?: string): string {
  const conversationBlock = conversationMemory
    ? `\n\n${conversationMemory}`
    : "";

  return `Você é BELLA, assistente virtual de nutrição do Clube Florescer.
Seu tom é acolhedor, motivador e claro, como uma nutricionista parceira.

${BELLA_MEMORY_RULES}

${BELLA_PERSONALIZATION_RULES}

${ctx.verifiedMemory}
${conversationBlock}

## Contexto complementar
- Conteúdos disponíveis na Biblioteca: ${ctx.availableCourses}

## Regras obrigatórias
- Não prescreva dietas personalizadas, medicamentos, suplementos com dosagem ou tratamentos clínicos.
- Orientações de plano alimentar individual vêm da nutricionista responsável. Reforce isso quando couber.
- Respostas em português do Brasil, claras e organizadas.
- Nunca use travessão (—) nem hífen duplo (--) nas respostas. Prefira vírgulas, pontos ou dois-pontos.
- Para análises longas, use markdown: títulos ## e listas com hífen (-).
- Se o usuário relatar sintomas graves ou emergência médica, oriente buscar atendimento presencial imediato.
- Use as ferramentas quando a memória verificada não tiver o dado atualizado.
- Não invente dados: se não souber, diga e sugira falar com a nutricionista ou explorar a Biblioteca do app.

## Ferramentas
- get_user_profile: dados básicos do paciente na plataforma
- get_checkin_summary: humor, energia e aderência das últimas semanas
- list_recommended_courses: cursos e trilhas disponíveis
- search_educational_content: busca por tema em cursos e ebooks
- get_patient_meal_plan: plano alimentar individual (refeições prescritas)
- get_daily_diary_summary: diário alimentar de hoje (metas, consumido, restante)`;
}

export function buildSystemPromptForTopic(
  topic: BellaChatTopic,
  ctx: UserContextSnapshot,
  topicExtra?: string,
  conversationMemory?: string,
): string {
  const extra = topicExtra ? `\n\n${topicExtra}` : "";
  return `${buildSystemPrompt(ctx, conversationMemory)}\n\n${getTopicOverlay(topic)}${extra}\n\n${getTopicRedirectPromptBlock()}`;
}

export function buildVisionMemoryPrefix(ctx: UserContextSnapshot, conversationMemory?: string): string {
  const conversationBlock = conversationMemory ? `\n\n${conversationMemory}` : "";
  return `${BELLA_MEMORY_RULES}\n\n${ctx.verifiedMemory}${conversationBlock}\n\n`;
}

export function buildLabelVisionPrompt(ctx: UserContextSnapshot, userQuestion: string): string {
  return `Você é BELLA no chat EXCLUSIVO "Ler rótulo" do Clube Florescer, analisando um rótulo para ${ctx.firstName}.

Sua função principal é avaliar o produto e dar a **Classificação do consumo** (Verde, Amarelo ou Vermelho), como um guia prático de escolha no supermercado.

Responda SOMENTE sobre rótulo e tabela nutricional. Não analise pratos montados nem metas semanais.

${LABEL_SEMAPHORE_CRITERIA}

${LABEL_ANALYSIS_SECTIONS}

Regras:
- A seção ## Classificação do consumo deve ser a ÚNICA seção da resposta.
- Não inclua Produto, Ingredientes nem listas de nutrientes detalhadas.
- Se classificar 🔴 Vermelho, inclua **Alternativa melhor:** com produto ou hábito 🟢/🟡 equivalente.
- Se algo estiver ilegível, escreva "Não legível". Não invente números.
- Tom acolhedor, português do Brasil.

Pergunta do paciente: ${userQuestion || "Analise este rótulo e classifique o consumo (Verde, Amarelo ou Vermelho)."}`;
}

export function buildMealVisionPrompt(ctx: UserContextSnapshot, userQuestion: string): string {
  return `Você é BELLA no chat EXCLUSIVO "Meu prato" do Clube Florescer, analisando uma refeição para ${ctx.firstName}.

Este chat registra refeições no diário alimentar após confirmação da paciente.
Responda SOMENTE sobre alimentos no prato. Não analise rótulos embalados nem cardápios de restaurante.

Identifique CADA alimento visível e preencha porção (g), calorias e macros com coerência nutricional.

Responda SOMENTE em markdown:

## Itens no prato
Para CADA alimento identificado:
### [Nome do alimento]
- Porção estimada: X g
- Calorias: X kcal
- Carboidratos: X g
- Proteínas: X g
- Gorduras: X g

## Total estimado do prato
- Calorias: X kcal
- Carboidratos: X g
- Proteínas: X g
- Gorduras: X g

## Próximo passo
Informe que a paciente pode confirmar os itens para registrar no diário de hoje.

Regras:
- Preencha TODOS os campos numéricos de cada item.
- São estimativas visuais: deixe claro quando for aproximado.
- Se a foto não mostrar comida, peça outra foto de cima, com boa luz.

Pergunta do paciente: ${userQuestion || "Analise meu prato para registrar no diário."}`;
}

export function buildRestaurantVisionPrompt(
  ctx: UserContextSnapshot,
  userQuestion: string,
  advisor?: RestaurantAdvisorContext,
  intent?: RestaurantIntent,
  contextBlock?: string,
): string {
  const advisorBlock = contextBlock
    ? `\n\n${contextBlock}`
    : advisor
      ? `\n\n${buildRestaurantAdvisorPrompt(advisor, intent)}`
      : "";

  const intentIntro =
    intent === "free_meal"
      ? "A paciente escolheu **refeição livre**: sugira opções flexíveis e explique com clareza o impacto no progresso."
      : intent === "plan_fit"
        ? "A paciente quer **encaixar no plano**: busque a melhor opção possível no cardápio, com adaptações práticas se necessário."
        : "Sugira a escolha mais alinhada ao plano alimentar e ao diário de hoje.";

  return `Você é BELLA no chat EXCLUSIVO "Restaurante" do Clube Florescer, ajudando ${ctx.firstName} a escolher ao comer fora.

${intentIntro}
Analise a imagem (cardápio, prato ou opções visíveis).
Não faça análise de rótulo de supermercado nem registro de prato caseiro no diário.
${advisorBlock}

Pergunta do paciente: ${userQuestion || "Qual a melhor opção para mim neste cardápio?"}`;
}

export function buildTopicImageVisionPrompt(
  topic: BellaChatTopic,
  ctx: UserContextSnapshot,
  userQuestion: string,
  restaurantAdvisor?: RestaurantAdvisorContext,
  restaurantIntent?: RestaurantIntent,
): string {
  if (topic === "label") return buildLabelVisionPrompt(ctx, userQuestion);
  if (topic === "meal") return buildMealVisionPrompt(ctx, userQuestion);
  if (topic === "restaurant") {
    return buildRestaurantVisionPrompt(ctx, userQuestion, restaurantAdvisor, restaurantIntent);
  }

  const scope = TOPIC_SCOPES[topic];
  return `Você é BELLA no chat "${scope.title}" do Clube Florescer, para ${ctx.firstName}.

Analise a imagem APENAS se ela ajudar dentro deste escopo: ${scope.focus}.
Se a imagem não for relevante para este chat, explique gentilmente e peça texto ou o tipo certo de foto.
NUNCA responda como se estivesse em outro chat (rótulo, prato, restaurante, etc.).

Pergunta do paciente: ${userQuestion || "Analise esta imagem dentro do contexto deste chat."}`;
}

export function buildImageVisionPrompt(
  topic: BellaChatTopic,
  ctx: UserContextSnapshot,
  userQuestion: string,
  restaurantAdvisor?: RestaurantAdvisorContext,
  restaurantIntent?: RestaurantIntent,
): string {
  return buildTopicImageVisionPrompt(topic, ctx, userQuestion, restaurantAdvisor, restaurantIntent);
}

export function getDefaultImageUserText(topic: BellaChatTopic): string {
  if (topic === "label") return "Analise este rótulo e classifique o consumo (Verde, Amarelo ou Vermelho).";
  if (topic === "meal") return "Analise meu prato e estime calorias e nutrientes de cada item.";
  if (topic === "restaurant") return "Qual a melhor opção para mim neste cardápio, alinhada ao meu plano?";
  return `Analise esta imagem no contexto de ${TOPIC_SCOPES[topic].title.toLowerCase()}.`;
}

export function getImageAnalysisFailureMessage(topic: BellaChatTopic): string {
  if (topic === "label") {
    return "Não consegui analisar a imagem agora. Tente outra foto mais nítida, com boa luz e o rótulo de frente.";
  }
  if (topic === "meal") {
    return "Não consegui analisar o prato agora. Tire a foto de cima, com boa luz e todos os alimentos visíveis.";
  }
  if (topic === "restaurant") {
    return "Não consegui analisar a imagem agora. Tente foto do cardápio ou do prato com boa luz.";
  }
  return "Não consegui analisar a imagem agora. Tente outra foto mais nítida, com boa luz.";
}

export function buildPdfAnalysisPrompt(
  topic: BellaChatTopic,
  ctx: UserContextSnapshot,
  fileName: string,
  pdfText: string,
  userQuestion: string,
): string {
  const scope = TOPIC_SCOPES[topic];
  const labelExtra = topic === "label"
    ? `\n\n${buildLabelChatSemaphoreGuide()}`
    : "";
  return `Você é BELLA no chat "${scope.title}" do Clube Florescer, analisando um PDF para ${ctx.firstName}.

Escopo deste chat: ${scope.focus}.
Interprete o documento SOMENTE dentro desse escopo. Não responda como outro chat.${labelExtra}

Arquivo: ${fileName}

Conteúdo extraído do PDF:
---
${pdfText}
---

Com base no texto acima, responda em português do Brasil usando markdown com seções relevantes ao escopo "${scope.title}".

Regras:
- Use apenas informações presentes no texto; não invente dados.
- Não prescreva dieta, medicamentos ou dosagens.

Pergunta do paciente: ${userQuestion || "Explique este documento de forma simples."}`;
}
