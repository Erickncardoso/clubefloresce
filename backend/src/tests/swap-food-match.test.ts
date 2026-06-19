import test from "node:test";
import assert from "node:assert/strict";
import {
  isCompoundDishName,
  pickBestFoodForSwap,
  scoreFoodForSwapMatch,
} from "../utils/swap-food-match";
import { scoreFoodSearchResult } from "../utils/food-search";
import type { FoodItemDto } from "../types/food.types";

function mockFood(name: string, source: "TACO" | "TBCA" = "TACO"): FoodItemDto {
  const per100g = {
    caloriesKcal: 40,
    proteinG: 1,
    carbsG: 8,
    fatG: 0.2,
    fiberG: 2,
    sodiumMg: 10,
  };

  return {
    id: name,
    source,
    sourceCode: "1",
    name,
    category: "Verduras, hortaliças e derivados",
    nutrients: { per100g },
    per100g,
  };
}

test("scoreFoodForSwapMatch: cenoura prioriza ingrediente base, não sanduíche", () => {
  const carrot = scoreFoodForSwapMatch("cenoura", "Cenoura, crua", "TACO");
  const sandwich = scoreFoodForSwapMatch(
    "cenoura",
    "Sanduíche, pão francês, c/ alface, tomate, cenoura e pepino",
    "TBCA",
  );

  assert.ok(carrot > sandwich);
});

test("pickBestFoodForSwap: escolhe Cenoura, crua para query cenoura", () => {
  const picked = pickBestFoodForSwap("cenoura", [
    mockFood("Sanduíche, pão francês, c/ alface, tomate, cenoura e pepino", "TBCA"),
    mockFood("Cenoura, cozida", "TACO"),
    mockFood("Cenoura, crua", "TACO"),
  ]);

  assert.match(picked?.name || "", /^Cenoura,/i);
});

test("pickBestFoodForSwap: prioriza batata cozida sobre crua para sopa", () => {
  const picked = pickBestFoodForSwap(
    "batata",
    [
      mockFood("Batata, inglesa, crua", "TACO"),
      mockFood("Batata, inglesa, cozida", "TACO"),
    ],
    { originalName: "sopa cheia(s) (100g)" },
  );

  assert.match(picked?.name || "", /cozida/i);
});

function mockFruit(
  name: string,
  caloriesKcal: number,
  carbsG: number,
  source: "TACO" | "TBCA" = "TACO",
): FoodItemDto {
  const per100g = {
    caloriesKcal,
    proteinG: 1.3,
    carbsG,
    fatG: 0.1,
    fiberG: 2,
    sodiumMg: 1,
  };

  return {
    id: name,
    source,
    sourceCode: "1",
    name,
    category: "Frutas e derivados",
    nutrients: { per100g },
    per100g,
  };
}

test("pickBestFoodForSwap: banana do plano prioriza TBCA in natura", () => {
  const picked = pickBestFoodForSwap(
    "banana",
    [
      mockFruit("Banana, doce em barra", 280, 75.7, "TACO"),
      mockFruit("Banana, prata, crua", 98, 26, "TACO"),
      mockFruit("Banana, prata, in natura , Brasil", 107, 24, "TBCA"),
    ],
    { originalName: "Banana 1 Unidade(s) grande(s) (100g)", expectedGroup: "fruit" },
  );

  assert.match(picked?.name || "", /in natura|prata/i);
  assert.equal(picked?.source, "TBCA");
});

test("pickBestFoodForSwap: banana do plano não vira doce em barra", () => {
  const picked = pickBestFoodForSwap(
    "banana",
    [
      mockFruit("Banana, doce em barra", 280, 75.7),
      mockFruit("Banana, prata, crua", 98, 26),
      mockFruit("Banana, nanica, crua", 92, 23),
    ],
    { originalName: "Banana 1 Unidade(s) grande(s) (100g)", expectedGroup: "fruit" },
  );

  assert.match(picked?.name || "", /crua/i);
  assert.ok(!/doce em barra/i.test(picked?.name || ""));
});

test("scoreFoodForSwapMatch: banana prioriza fruta crua sobre doce em barra", () => {
  const fresh = scoreFoodForSwapMatch("banana", "Banana, prata, crua", "TACO");
  const candy = scoreFoodForSwapMatch("banana", "Banana, doce em barra", "TACO");

  assert.ok(fresh > candy);
});

test("scoreFoodSearchResult: prioriza TBCA sobre TACO com mesmo nome", () => {
  const name = "Banana, prata, in natura";
  const tbca = scoreFoodSearchResult("banana prata", name, "TBCA");
  const taco = scoreFoodSearchResult("banana prata", name, "TACO");
  assert.ok(tbca > taco);
});

test("isCompoundDishName: detecta sanduíche composto", () => {
  assert.equal(
    isCompoundDishName("Sanduíche, pão francês, c/ alface, tomate, cenoura e pepino"),
    true,
  );
  assert.equal(isCompoundDishName("Cenoura, crua"), false);
});
