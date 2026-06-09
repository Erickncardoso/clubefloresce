import test from "node:test";
import assert from "node:assert/strict";
import { BELLA_MEMORY_RULES } from "../services/bella/memory-rules";
import { buildConversationMemoryBlock } from "../services/bella/conversation-memory";
import { buildSystemPrompt } from "../services/bella/prompts";

const mockCtx = {
  userId: "user-123",
  name: "Ana Silva",
  firstName: "Ana",
  plan: "Premium",
  memberSince: "01 jan. 2024",
  checkInSummary: "Sem check-ins",
  availableCourses: "Curso A",
  verifiedMemory: "## Memória verificada\n- Paciente ativa: **Ana Silva**",
  currentMealSlot: "Almoço",
  hasMealPlan: true,
};

test("memory-rules: proíbe confundir pacientes", () => {
  assert.match(BELLA_MEMORY_RULES, /UMA paciente/);
  assert.match(BELLA_MEMORY_RULES, /NUNCA confunda/);
  assert.match(BELLA_MEMORY_RULES, /NUNCA invente/);
});

test("buildSystemPrompt: inclui memória verificada", () => {
  const prompt = buildSystemPrompt(mockCtx);
  assert.match(prompt, /Memória verificada/);
  assert.match(prompt, /Ana Silva/);
  assert.match(BELLA_MEMORY_RULES, /fonte de verdade/);
});

test("buildConversationMemoryBlock: resume histórico do tópico", () => {
  const block = buildConversationMemoryBlock("meal", [
    { role: "user", content: "Analisei meu almoço" },
    { role: "assistant", content: "Registrei 450 kcal" },
  ]);
  assert.match(block, /meal/);
  assert.match(block, /Paciente:/);
  assert.match(block, /Bella:/);
  assert.match(block, /banco prevalece/);
});
