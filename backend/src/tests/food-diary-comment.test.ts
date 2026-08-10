import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFoodDiaryCommentContent } from "../utils/food-diary-comment";

test("normalizeFoodDiaryCommentContent trim e aceita texto válido", () => {
  assert.equal(normalizeFoodDiaryCommentContent("  oi  "), "oi");
});

test("normalizeFoodDiaryCommentContent rejeita vazio", () => {
  assert.throws(() => normalizeFoodDiaryCommentContent("   "), /obrigatório/i);
});

test("normalizeFoodDiaryCommentContent rejeita não-string", () => {
  assert.throws(() => normalizeFoodDiaryCommentContent(null), /obrigatório/i);
});

test("normalizeFoodDiaryCommentContent rejeita > 1000 chars", () => {
  assert.throws(() => normalizeFoodDiaryCommentContent("a".repeat(1001)), /1000/i);
});
