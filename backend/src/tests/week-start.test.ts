import test from "node:test";
import assert from "node:assert/strict";
import {
  getWeekStartInTimeZone,
  resolvePatientWeekStart,
} from "../utils/week-start";

test("getWeekStartInTimeZone usa semana civil no fuso do paciente", () => {
  const thursday = new Date("2026-06-18T15:00:00.000Z");
  const weekStart = getWeekStartInTimeZone("America/Sao_Paulo", thursday);
  assert.equal(weekStart.toISOString(), "2026-06-15T12:00:00.000Z");
});

test("getWeekStartInTimeZone não cai na semana anterior na madrugada de segunda", () => {
  const mondayEarly = new Date("2026-06-15T03:30:00.000Z");
  const weekStart = getWeekStartInTimeZone("America/Sao_Paulo", mondayEarly);
  assert.equal(weekStart.toISOString(), "2026-06-15T12:00:00.000Z");
});

test("resolvePatientWeekStart respeita X-Patient-Date", () => {
  const weekStart = resolvePatientWeekStart({
    patientDate: "2026-06-18",
    patientTimeZone: "America/Sao_Paulo",
  });
  assert.equal(weekStart.toISOString(), "2026-06-15T12:00:00.000Z");
});
