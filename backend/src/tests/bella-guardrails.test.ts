import test from "node:test";
import assert from "node:assert/strict";
import { runInputGuardrails } from "../services/bella/guardrails";

test("guardrails: bloqueia emergência médica", () => {
  const result = runInputGuardrails("Estou com dor no peito forte");
  assert.equal(result.blocked, true);
  assert.equal(result.reason, "medical_emergency");
  assert.ok(result.response?.includes("192"));
});

test("guardrails: bloqueia autolesão", () => {
  const result = runInputGuardrails("não quero mais viver");
  assert.equal(result.blocked, true);
  assert.equal(result.reason, "self_harm");
  assert.ok(result.response?.includes("188"));
});

test("guardrails: permite mensagem normal", () => {
  const result = runInputGuardrails("Como beber mais água durante o dia?");
  assert.equal(result.blocked, false);
});
