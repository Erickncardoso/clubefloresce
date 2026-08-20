import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MEALS,
  getMealsForReminder,
  normalizeMealTime,
  parseTimeToMinutes,
} from "../utils/meal-time";
import { mealReminderSourceKey } from "../services/meal-reminder-dispatch.service";
import { isMealRemindersEnabled, isDiarySocialPushEnabled, resolvePatientTimezone } from "../services/patient-preferences.service";
import {
  buildMealReminderBody,
  buildMealReminderPushContent,
  buildMealReminderTitle,
  formatMealReminderItemLine,
} from "../utils/meal-reminder-copy";

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

test("preferences: curtidas do diário ativas por padrão", () => {
  assert.equal(isDiarySocialPushEnabled({}), true);
  assert.equal(isDiarySocialPushEnabled({ diarySocialPushEnabled: false }), false);
});

test("mealReminderSourceKey: chave única por dia, slot e usuária", () => {
  assert.equal(
    mealReminderSourceKey("2026-06-24", "lanche-da-tarde", "user-1"),
    "meal-reminder:2026-06-24:lanche-da-tarde:user-1",
  );
});

test("meal-reminder-copy: título é o nome da refeição", () => {
  assert.equal(buildMealReminderTitle({ label: "Ceia" }), "Ceia");
  assert.equal(buildMealReminderTitle({ label: "  Almoço  " }), "Almoço");
  assert.equal(buildMealReminderTitle({ label: "" }), "Refeição");
});

test("meal-reminder-copy: corpo lista itens com porção", () => {
  const line = formatMealReminderItemLine({
    key: "1",
    name: "Gelatina zero açúcar preparada (Royal)",
    amount: 10,
    unit: "colheres de sopa",
    grams: 250,
    ml: null,
    display: "Gelatina zero açúcar preparada (Royal) 10 colheres de sopa (250 g)",
    substitutions: [],
  });
  assert.equal(
    line,
    "Gelatina zero açúcar preparada (Royal) · 10 colheres de sopa · 250 g",
  );

  const body = buildMealReminderBody({
    items: [
      {
        key: "1",
        name: "Gelatina zero açúcar preparada (Royal)",
        amount: 10,
        unit: "colheres de sopa",
        grams: 250,
        ml: null,
        display: "",
        substitutions: [],
      },
      {
        key: "2",
        name: "Chá de camomila",
        amount: 1,
        unit: "xícara",
        grams: null,
        ml: 200,
        display: "Chá de camomila",
        substitutions: [],
      },
    ],
  });
  assert.match(body, /Gelatina zero açúcar/);
  assert.match(body, /Chá de camomila/);
});

test("meal-reminder-copy: push com itens extras usa subtitle", () => {
  const content = buildMealReminderPushContent({
    items: [
      { key: "1", name: "Arroz", amount: 4, unit: "colheres", grams: 80, ml: null, display: "", substitutions: [] },
      { key: "2", name: "Feijão", amount: 1, unit: "concha", grams: 90, ml: null, display: "", substitutions: [] },
      { key: "3", name: "Frango", amount: 1, unit: "filé", grams: 120, ml: null, display: "", substitutions: [] },
      { key: "4", name: "Salada", amount: 1, unit: "porção", grams: 50, ml: null, display: "", substitutions: [] },
      { key: "5", name: "Suco", amount: 1, unit: "copo", grams: null, ml: 200, display: "", substitutions: [] },
    ],
  });
  assert.match(content.body, /\+2 itens/);
  assert.match(content.subtitle || "", /Salada/);
  assert.match(content.subtitle || "", /Suco/);
  assert.match(content.fullBody, /Arroz/);
  assert.match(content.fullBody, /Suco/);
});

test("meal-reminder-copy: sem itens usa CTA genérico", () => {
  assert.equal(
    buildMealReminderBody({ items: [] }),
    "Registre sua refeição no diário alimentar.",
  );
});
