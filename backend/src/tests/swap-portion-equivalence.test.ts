import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEquivalentPortion,
  computeEquivalentPortionGrams,
} from "../utils/swap-portion-equivalence";
import type { NormalizedPer100g } from "../utils/food-macros";

const batataCozida: NormalizedPer100g = {
  caloriesKcal: 52,
  carbsG: 11.9,
  proteinG: 1.2,
  fatG: 0,
  energyPolicy: "atwater",
};

const targetSoup = {
  grams: 100,
  caloriesKcal: 128,
  carbsG: 28.1,
  proteinG: 2.5,
  fatG: 0.2,
};

test("computeEquivalentPortionGrams: aproxima carboidratos para sopa → batata cozida", () => {
  const grams = computeEquivalentPortionGrams(batataCozida, targetSoup, "carbs");
  const portion = buildEquivalentPortion(batataCozida, targetSoup, "carbs");

  assert.ok(grams >= 180 && grams <= 280, `gramas fora do esperado: ${grams}`);
  assert.ok(
    Math.abs(portion.carbsG - targetSoup.carbsG) <= 4,
    `carboidratos: ${portion.carbsG} vs ${targetSoup.carbsG}`,
  );
  assert.ok(
    Math.abs(portion.caloriesKcal - targetSoup.caloriesKcal) <= 25,
    `kcal: ${portion.caloriesKcal} vs ${targetSoup.caloriesKcal}`,
  );
});

test("buildEquivalentPortion: gramas e macros coerentes", () => {
  const portion = buildEquivalentPortion(batataCozida, targetSoup, "carbs");
  assert.equal(portion.grams, computeEquivalentPortionGrams(batataCozida, targetSoup, "carbs"));
  assert.ok(portion.caloriesKcal > 0);
  assert.ok(portion.carbsG > 0);
});
