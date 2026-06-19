import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { FoodItemDto } from "../types/food.types";
import { normalizePer100gMacros, macrosAtGramsFromPer100g } from "../utils/food-macros";

function tacoBananaPrata(): FoodItemDto {
  const tacoPath = path.join(__dirname, "../../data/foods/taco.json");
  const taco = JSON.parse(fs.readFileSync(tacoPath, "utf8")) as Array<Record<string, unknown>>;
  const b = taco.find((item) => item.name === "Banana, prata, crua");
  assert.ok(b, "Banana, prata, crua deve existir no taco.json");

  return {
    id: "taco-banana-prata",
    source: "TACO",
    sourceCode: String(b.sourceCode),
    name: String(b.name),
    category: String(b.category),
    nutrients: {
      per100g: b.nutrientsPer100g as FoodItemDto["nutrients"]["per100g"],
    },
    per100g: {
      caloriesKcal: Number(b.caloriesKcal),
      proteinG: Number(b.proteinG),
      carbsG: Number(b.carbsG),
      fatG: Number(b.fatG),
      fiberG: Number(b.fiberG),
      sodiumMg: Number(b.sodiumMg),
    },
  };
}

function tbcaSample(): FoodItemDto {
  const tbcaPath = path.join(__dirname, "../../data/foods/tbca.json");
  const tbca = JSON.parse(fs.readFileSync(tbcaPath, "utf8")) as Array<Record<string, unknown>>;
  const item = tbca[0];
  assert.ok(item, "tbca.json deve ter itens");

  const nutrients = item.nutrientsPer100g as FoodItemDto["nutrients"]["per100g"];

  return {
    id: "tbca-sample",
    source: "TBCA",
    sourceCode: String(item.sourceCode),
    name: String(item.name),
    category: String(item.category),
    nutrients: { per100g: nutrients },
    per100g: {
      caloriesKcal: Number(item.caloriesKcal),
      proteinG: Number(item.proteinG),
      carbsG: Number(item.carbsG),
      fatG: Number(item.fatG),
      fiberG: Number(item.fiberG),
      sodiumMg: Number(item.sodiumMg),
    },
  };
}

test("TACO banana prata: usa energia declarada na tabela (98 kcal / 100g)", () => {
  const per100 = normalizePer100gMacros(tacoBananaPrata());

  assert.equal(per100.energyPolicy, "table");
  assert.equal(per100.carbsG, 26);
  assert.equal(per100.proteinG, 1.3);
  assert.equal(per100.fatG, 0.1);
  assert.equal(per100.fiberG, 2);
  assert.equal(per100.caloriesKcal, 98);
});

test("TACO banana prata: porção escala pela tabela, não Atwater", () => {
  const per100 = normalizePer100gMacros(tacoBananaPrata());
  const medium = macrosAtGramsFromPer100g(per100, 120);

  assert.equal(medium.grams, 120);
  assert.equal(medium.carbsG, 31.2);
  assert.equal(medium.caloriesKcal, 118);
});

test("TBCA: usa energia e macros já calculados na base", () => {
  const food = tbcaSample();
  const per100 = normalizePer100gMacros(food);

  assert.equal(per100.energyPolicy, "table");
  assert.equal(per100.caloriesKcal, Math.round(Number(food.per100g.caloriesKcal)));
  assert.equal(per100.carbsG, round1(Number(food.nutrients.per100g.carbsAvailableG)));
});

function round1(value: number) {
  return Math.round(value * 10) / 10;
}
