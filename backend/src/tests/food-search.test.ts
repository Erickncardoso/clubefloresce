import test from "node:test";
import assert from "node:assert/strict";
import {
  countMatchingFoodTokens,
  minRelaxedTokenMatches,
  pickBestFoodMatch,
  tokenizeFoodQuery,
} from "../utils/food-search";
import { scoreFoodForMealPlanSearch } from "../utils/food-meal-plan-search";

test("tokenizeFoodQuery: ignora stop words como de e sem", () => {
  const tokens = tokenizeFoodQuery("Pão de forma multigraos sem glúten");
  assert.deepEqual(tokens, ["pao", "forma", "multigraos", "gluten"]);
});

test("countMatchingFoodTokens: pão glúten forma bate parcialmente com nome TACO", () => {
  const matches = countMatchingFoodTokens(
    "Pão de forma multigraos sem glúten",
    "Pão, glúten, forma",
  );
  assert.equal(matches, 3);
});

test("pickBestFoodMatch: prioriza pão sem glúten para busca longa importada", () => {
  const picked = pickBestFoodMatch("Pão de forma multigraos sem glúten", [
    { name: "Pão, trigo, forma, integral", source: "TACO" },
    { name: "Pão, glúten, forma", source: "TACO" },
    { name: "Pão, milho, forma", source: "TACO" },
  ]);

  assert.equal(picked?.name, "Pão, glúten, forma");
});

test("minRelaxedTokenMatches: exige metade dos tokens quando há vários", () => {
  assert.equal(minRelaxedTokenMatches(4), 2);
  assert.equal(minRelaxedTokenMatches(3), 2);
  assert.equal(minRelaxedTokenMatches(1), 1);
});

test("scoreFoodForMealPlanSearch: pão de forma prioriza TBCA canônico", () => {
  const q = "Pão de forma";
  const canonical = scoreFoodForMealPlanSearch(
    q,
    "Pão, c/ farinha de trigo refinada, glúten, forma, Brasil",
    "TBCA",
    "BRC0145A",
  );
  const sandwich = scoreFoodForMealPlanSearch(
    q,
    "Sanduíche, pão forma integral, c/ cream cheese",
    "TBCA",
    "BRC0476A",
  );
  assert.ok(canonical > sandwich);
});
