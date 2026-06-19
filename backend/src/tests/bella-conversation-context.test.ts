import test from "node:test";
import assert from "node:assert/strict";
import {
  extractImageUrlFromStoredMessages,
  isLabelContinuationMessage,
  shouldAnalyzeImageAsLabel,
} from "../services/bella/bella-conversation-context";

test("isLabelContinuationMessage: detecta margarina vs manteiga", () => {
  assert.equal(isLabelContinuationMessage("o melhor não seria manteiga??"), true);
});

test("shouldAnalyzeImageAsLabel: foto em Fazer pergunta vai para leitura de rótulo", () => {
  assert.equal(shouldAnalyzeImageAsLabel("ask", ""), true);
  assert.equal(shouldAnalyzeImageAsLabel("ask", "foto do meu almoço"), false);
});

test("extractImageUrlFromStoredMessages: pega última imagem do usuário", () => {
  const url = extractImageUrlFromStoredMessages([
    {
      role: "user",
      content: "Analise este rótulo",
      createdAt: new Date(),
      metadata: {
        attachment: { type: "image", url: "https://cdn.example/rotulo.jpg" },
      },
    },
  ]);

  assert.equal(url, "https://cdn.example/rotulo.jpg");
});
