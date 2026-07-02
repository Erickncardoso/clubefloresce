import test from "node:test";
import assert from "node:assert/strict";
import {
  billingPlanConfigService,
  computeBillingPeriodDays,
  parseBillablePlanId,
  parseBillingAmount,
} from "../services/billing-plan-config.service";

test("parseBillablePlanId: aceita ids de produto", () => {
  assert.equal(parseBillablePlanId("premium"), "premium");
  assert.equal(parseBillablePlanId(" PLATINUM "), "PLATINUM");
  assert.equal(parseBillablePlanId("prod-abc123"), "prod-abc123");
});

test("parseBillablePlanId: rejeita vazio", () => {
  assert.throws(() => parseBillablePlanId(""), /Plano inválido/);
});

test("parseBillingAmount: normaliza vírgula e arredonda", () => {
  assert.equal(parseBillingAmount("19,90", 0), 19.9);
  assert.equal(parseBillingAmount("19.901", 0), 19.9);
});

test("parseBillingAmount: usa fallback quando vazio", () => {
  assert.equal(parseBillingAmount(null, 19.9), 19.9);
});

test("parseBillingAmount: rejeita valor inválido", () => {
  assert.throws(() => parseBillingAmount("0", 19.9), /Valor do produto inválido/);
  assert.throws(() => parseBillingAmount("-5", 19.9), /Valor do produto inválido/);
});

test("computeBillingPeriodDays: meses e dias", () => {
  assert.equal(computeBillingPeriodDays(1, "months"), 30);
  assert.equal(computeBillingPeriodDays(7, "days"), 7);
});

test("toUserPlan: mapeia accessPlan para UserPlan", () => {
  assert.equal(billingPlanConfigService.toUserPlan("PREMIUM"), "PREMIUM");
  assert.equal(billingPlanConfigService.toUserPlan("PLATINUM"), "PLATINUM");
});
