import test from "node:test";
import assert from "node:assert/strict";
import { resolvePeriodKey } from "../utils/patient-local-date";
import { getDateKeyInTimeZone } from "../utils/patient-timezone";

test("getDateKeyInTimeZone evita dia UTC no Brasil", () => {
  assert.equal(
    getDateKeyInTimeZone("America/Sao_Paulo", new Date("2026-07-04T02:30:00.000Z")),
    "2026-07-03",
  );
});

test("resolvePeriodKey daily preserva a data informada", () => {
  assert.equal(resolvePeriodKey("daily", "2026-07-04", "America/Sao_Paulo"), "2026-07-04");
});

test("resolvePeriodKey weekly respeita a data informada", () => {
  const periodKey = resolvePeriodKey("weekly", "2026-07-04", "America/Sao_Paulo");
  assert.equal(periodKey, "2026-06-29T12:00:00.000Z");
});

test("resolvePeriodKey monthly usa mês civil da data informada", () => {
  assert.equal(resolvePeriodKey("monthly", "2026-07-15", "America/Sao_Paulo"), "2026-07");
});
