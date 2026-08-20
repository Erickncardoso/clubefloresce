import assert from "node:assert/strict";
import test from "node:test";
import { checkoutCpfToPersist, cpfFromPatientProfileData } from "../utils/billing-payment-method";

test("checkoutCpfToPersist: ignora CPF de teste do Mercado Pago", () => {
  assert.equal(checkoutCpfToPersist({ number: "12345678909" }), "");
});

test("checkoutCpfToPersist: aceita CPF real", () => {
  assert.equal(checkoutCpfToPersist({ number: "529.982.247-25" }), "52998224725");
});

test("cpfFromPatientProfileData: lê a ficha", () => {
  assert.equal(cpfFromPatientProfileData({ cpf: "52998224725" }), "52998224725");
  assert.equal(cpfFromPatientProfileData({}), "");
});
