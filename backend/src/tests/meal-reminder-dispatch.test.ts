import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MEALS,
  getMealsForReminder,
  normalizeMealTime,
  parseTimeToMinutes,
} from "../utils/meal-time";
import { mealReminderSourceKey } from "../services/meal-reminder-dispatch.service";
import { isMealRemindersEnabled, resolvePatientTimezone } from "../services/patient-preferences.service";

test("meal-time: normaliza horários com um dígito", () => {
  assert.equal(normalizeMealTime("7:00"), "07:00");
  assert.equal(parseTimeToMinutes("7:00"), 7 * 60);
});

test("meal-time: usa refeições do plano quando há horário", () => {
  const meals = getMealsForReminder([
    { id: "cafe", label: "Café", time: "08:15", items: [] },
    { id: "almoco", label: "Almoço", time: "13:00", items: [] },
  ]);
  assert.equal(meals.length, 2);
  assert.equal(meals[0].time, "08:15");
});

test("meal-time: cai nos horários padrão sem plano", () => {
  assert.deepEqual(getMealsForReminder(), DEFAULT_MEALS);
});

test("preferences: usa fuso padrão quando ausente", () => {
  assert.equal(resolvePatientTimezone({}), "America/Sao_Paulo");
});

test("preferences: lembretes ativos por padrão", () => {
  assert.equal(isMealRemindersEnabled({}), true);
  assert.equal(isMealRemindersEnabled({ mealRemindersEnabled: false }), false);
});

test("mealReminderSourceKey: chave única por dia, refeição e usuária", () => {
  assert.equal(
    mealReminderSourceKey("2026-06-24", "lunch", "user-1"),
    "meal-reminder:2026-06-24:lunch:user-1",
  );
});
