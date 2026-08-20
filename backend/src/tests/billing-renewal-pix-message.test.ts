import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRenewalPixWhatsappText, formatBillingBrl } from "../utils/billing-renewal-pix-message";

describe("billing renewal pix message", () => {
  it("formata o valor em real", () => {
    assert.match(formatBillingBrl(19.9), /19,90/);
  });

  it("inclui o copia e cola do Pix na mensagem", () => {
    const text = buildRenewalPixWhatsappText({
      firstName: "Maria",
      amount: 19.9,
      pixCopyPaste: "00020126TESTEPIX",
    });
    assert.match(text, /Maria/);
    assert.match(text, /00020126TESTEPIX/);
    assert.match(text, /24h/);
  });
});
