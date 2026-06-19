import test from "node:test";
import assert from "node:assert/strict";
import {
  getTopicOfflineReply,
  getTopicScopeRules,
  isLikelyGreeting,
  normalizeTopic,
} from "../services/bella/topic-config";
import {
  buildImageVisionPrompt,
  buildPdfAnalysisPrompt,
} from "../services/bella/prompts";
import { resolveTaskType } from "../services/bella/model-config";

const mockCtx = {
  userId: "test-user",
  firstName: "Ana",
  name: "Ana Silva",
  plan: "Premium",
  memberSince: "2024-01-01",
  checkInSummary: "Sem check-ins",
  availableCourses: "Curso A",
  verifiedMemory: "## Memória verificada\n- Paciente: Ana Silva",
  currentMealSlot: "Almoço",
  hasMealPlan: false,
};

test("normalizeTopic: desconhecido vira general", () => {
  assert.equal(normalizeTopic("xyz"), "general");
  assert.equal(normalizeTopic("label"), "label");
});

test("isLikelyGreeting: detecta cumprimentos", () => {
  assert.equal(isLikelyGreeting("oi"), true);
  assert.equal(isLikelyGreeting("Olá!"), true);
  assert.equal(isLikelyGreeting("bom dia"), true);
  assert.equal(isLikelyGreeting("quero saber sobre sódio"), false);
});

test("getTopicOfflineReply: label fala de rótulo", () => {
  const reply = getTopicOfflineReply("label", "Ana");
  assert.match(reply, /rótul/i);
  assert.doesNotMatch(reply, /prato|restaurante|meta semanal/i);
});

test("getTopicOfflineReply: meal fala de prato", () => {
  const reply = getTopicOfflineReply("meal", "Ana");
  assert.match(reply, /prato|calorias/i);
  assert.doesNotMatch(reply, /rótul|restaurante/i);
});

test("getTopicScopeRules: label proíbe prato", () => {
  const rules = getTopicScopeRules("label");
  assert.match(rules, /Ler rótulo/);
  assert.match(rules, /NUNCA responda sobre/);
  assert.match(rules, /pratos montados/i);
});

test("buildImageVisionPrompt: label inclui classificação do consumo", () => {
  const prompt = buildImageVisionPrompt("label", mockCtx, "oi");
  assert.match(prompt, /Classificação do consumo/i);
  assert.match(prompt, /Verde|Amarelo|Vermelho/);
  assert.match(prompt, /NUNCA inclua seções ## Produto/i);
  assert.match(prompt, /FONTE DE PROTEÍNA/i);
  assert.match(prompt, /MAIORES.*carboidratos/i);
  assert.match(prompt, /proteína baixa/i);
  assert.match(prompt, /NUNCA.*boa quantidade de proteína/i);
  assert.match(prompt, /6 g de proteína, escreva 6 g/i);
  assert.match(prompt, /Preciso de uma foto melhor/i);
  assert.match(prompt, /NÃO invente, estime nem arredonde/i);
  assert.match(prompt, /porção de referência/i);
  assert.match(prompt, /60 g \(1 unidade\)/i);
});

test("buildImageVisionPrompt: meal não menciona rótulo", () => {
  const prompt = buildImageVisionPrompt("meal", mockCtx, "oi");
  assert.match(prompt, /prato|refeição/i);
  assert.match(prompt, /Não analise rótulos/i);
});

test("buildPdfAnalysisPrompt: escopo do tópico goal", () => {
  const prompt = buildPdfAnalysisPrompt("goal", mockCtx, "meta.pdf", "texto", "resuma");
  assert.match(prompt, /Meta semanal/);
  assert.match(prompt, /check-ins|evolução/i);
});

test("resolveTaskType: tópico label com imagem usa image", () => {
  assert.equal(
    resolveTaskType({
      topic: "label",
      hasFile: true,
      mimeType: "image/jpeg",
      message: "oi",
    }),
    "image",
  );
});

test("resolveTaskType: tópico goal com mensagem de rótulo não força image sem arquivo", () => {
  assert.equal(
    resolveTaskType({
      topic: "goal",
      message: "me fale sobre rótulos",
      hasFile: false,
    }),
    "chat",
  );
});

test("resolveTaskType: general infere image por palavra-chave com arquivo", () => {
  assert.equal(
    resolveTaskType({
      topic: "general",
      message: "analise este rótulo",
      hasFile: true,
      mimeType: "image/png",
    }),
    "image",
  );
});
