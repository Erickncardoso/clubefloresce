import test from "node:test";
import assert from "node:assert/strict";
import { resolveRestaurantMealSlot } from "../services/bella/restaurant-meal-slot";
import type { ParsedMeal } from "../types/meal-plan.types";

const samplePlan: ParsedMeal[] = [
  {
    id: "breakfast",
    label: "Café da manhã",
    time: "07:00",
    items: [{ key: "ovo", name: "Ovo", amount: 1, unit: "un", grams: 50, ml: null, display: "1 un", substitutions: [] }],
  },
  {
    id: "lunch",
    label: "Almoço",
    time: "12:30",
    items: [{ key: "frango", name: "Frango grelhado", amount: 120, unit: "g", grams: 120, ml: null, display: "120 g", substitutions: [] }],
  },
  {
    id: "dinner",
    label: "Jantar",
    time: "19:30",
    items: [{ key: "salmao", name: "Salmão", amount: 150, unit: "g", grams: 150, ml: null, display: "150 g", substitutions: [] }],
  },
];

test("resolveRestaurantMealSlot: rodízio japonês vai para almoço, não café da manhã", () => {
  const result = resolveRestaurantMealSlot({
    planMeals: samplePlan,
    loggedMealTypes: [],
    userMessage: "Quero comer no rodízio japonês hoje",
    patientTimeZone: "America/Sao_Paulo",
    now: new Date("2026-06-18T11:00:00-03:00"),
  });

  assert.equal(result.mealLabel, "Almoço");
  assert.match(result.prescribedMealText, /Frango grelhado/);
  assert.doesNotMatch(result.prescribedMealText, /Ovo/);
});

test("resolveRestaurantMealSlot: restaurante à noite usa jantar", () => {
  const result = resolveRestaurantMealSlot({
    planMeals: samplePlan,
    loggedMealTypes: ["lunch"],
    userMessage: "Vou no restaurante japonês",
    patientTimeZone: "America/Sao_Paulo",
    now: new Date("2026-06-18T20:00:00-03:00"),
  });

  assert.equal(result.mealLabel, "Jantar");
  assert.match(result.prescribedMealText, /Salmão/);
});

test("resolveRestaurantMealSlot: respeita jantar explícito na mensagem", () => {
  const result = resolveRestaurantMealSlot({
    planMeals: samplePlan,
    loggedMealTypes: [],
    userMessage: "Jantar no rodízio",
    patientTimeZone: "America/Sao_Paulo",
    now: new Date("2026-06-18T11:00:00-03:00"),
  });

  assert.equal(result.mealLabel, "Jantar");
});
