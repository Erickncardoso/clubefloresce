import test from "node:test";
import assert from "node:assert/strict";
import { findActiveSwapMessage } from "../../../frontend/utils/bella-swap.js";

test("findActiveSwapMessage ignora pendências antigas após substituição concluída", () => {
  const messages = [
    {
      id: "meal",
      role: "assistant",
      content: "Refeição?",
      metadata: {
        topic: "swap",
        pendingSwapSelection: true,
        swapOptions: [{ id: "lunch", label: "Almoço" }],
      },
    },
    {
      id: "suggestion",
      role: "assistant",
      content: "Sugestões",
      metadata: {
        topic: "swap",
        pendingSwapSelection: true,
        swapStep: "suggestion",
        swapOptions: [{ id: "suggestion-0", label: "Abacaxi" }],
      },
    },
    {
      id: "done",
      role: "assistant",
      content: "**Substituição no plano**",
      metadata: { topic: "swap", swapCompleted: true },
    },
  ];

  assert.equal(findActiveSwapMessage(messages), null);
});

test("findActiveSwapMessage retorna etapa pendente quando fluxo não concluiu", () => {
  const messages = [
    {
      id: "suggestion",
      role: "assistant",
      content: "Sugestões",
      metadata: {
        topic: "swap",
        pendingSwapSelection: true,
        swapStep: "suggestion",
        swapOptions: [{ id: "suggestion-0", label: "Abacaxi" }],
      },
    },
  ];

  assert.equal(findActiveSwapMessage(messages)?.id, "suggestion");
});
