import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTopicLink,
  detectBestTopicForMessage,
  evaluateTopicRedirect,
} from "../services/bella/topic-router";

test("detectBestTopicForMessage: macarrão calórico vai para ask", () => {
  assert.equal(
    detectBestTopicForMessage("macarrão é calórico?"),
    "ask",
  );
});

test("detectBestTopicForMessage: rótulo fica em label", () => {
  assert.equal(
    detectBestTopicForMessage("pode analisar o rótulo desse molho?"),
    "label",
  );
});

test("evaluateTopicRedirect: label redireciona pergunta geral para ask", () => {
  const decision = evaluateTopicRedirect({
    topic: "label",
    message: "macarrão engorda?",
    firstName: "Ana",
  });
  assert.ok(decision);
  assert.equal(decision?.targetTopic, "ask");
  assert.match(decision?.reply || "", /\[\[chat:ask\|Fazer pergunta\]\]/);
});

test("evaluateTopicRedirect: label com pergunta de rótulo não redireciona", () => {
  const decision = evaluateTopicRedirect({
    topic: "label",
    message: "esse rótulo tem muito sódio?",
    firstName: "Ana",
  });
  assert.equal(decision, null);
});

test("evaluateTopicRedirect: label redireciona fale mais para ask", () => {
  const decision = evaluateTopicRedirect({
    topic: "label",
    message: "fale mais",
    firstName: "Maria",
  });
  assert.ok(decision);
  assert.equal(decision?.targetTopic, "ask");
});

test("buildTopicLink: formato esperado", () => {
  assert.equal(buildTopicLink("ask"), "[[chat:ask|Fazer pergunta]]");
});
