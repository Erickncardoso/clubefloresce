import test from "node:test";
import assert from "node:assert/strict";
import {
  LABEL_SEMAPHORE_CRITERIA,
  LABEL_SEMAPHORE_EMOJI,
  LABEL_SEMAPHORE_LABELS,
} from "../services/bella/label-semaphore";

test("label-semaphore: define três cores", () => {
  assert.equal(LABEL_SEMAPHORE_EMOJI.green, "🟢");
  assert.equal(LABEL_SEMAPHORE_EMOJI.yellow, "🟡");
  assert.equal(LABEL_SEMAPHORE_EMOJI.red, "🔴");
  assert.match(LABEL_SEMAPHORE_LABELS.green, /Verde/);
  assert.match(LABEL_SEMAPHORE_LABELS.red, /Vermelho/);
});

test("label-semaphore: critérios incluem NOVA e castanhas naturais", () => {
  assert.match(LABEL_SEMAPHORE_CRITERIA, /NOVA/);
  assert.match(LABEL_SEMAPHORE_CRITERIA, /castanhas|sementes/i);
  assert.match(LABEL_SEMAPHORE_CRITERIA, /fibras isoladas/i);
  assert.match(LABEL_SEMAPHORE_CRITERIA, /gordura trans/i);
});
