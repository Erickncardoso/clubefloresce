import test from "node:test";
import assert from "node:assert/strict";
import {
  ATWATER_ALCOHOL_KCAL_PER_G,
  ATWATER_CARBS_KCAL_PER_G,
  ATWATER_FAT_KCAL_PER_G,
  ATWATER_PROTEIN_KCAL_PER_G,
  calculateAtwaterCalories,
  calculateAtwaterCaloriesRaw,
  macroEnergyContributions,
} from "../utils/atwater";

test("fatores Atwater: 4 / 4 / 9 kcal por grama", () => {
  assert.equal(ATWATER_CARBS_KCAL_PER_G, 4);
  assert.equal(ATWATER_PROTEIN_KCAL_PER_G, 4);
  assert.equal(ATWATER_FAT_KCAL_PER_G, 9);
  assert.equal(ATWATER_ALCOHOL_KCAL_PER_G, 7);
});

test("banana prata 100g: 22,8 C + 1,3 P + 0,1 G ≈ 97 kcal", () => {
  const parts = macroEnergyContributions({
    carbsG: 22.8,
    proteinG: 1.3,
    fatG: 0.1,
  });

  assert.ok(Math.abs(parts.carbsKcal - 91.2) < 0.01);
  assert.ok(Math.abs(parts.proteinKcal - 5.2) < 0.01);
  assert.ok(Math.abs(parts.fatKcal - 0.9) < 0.01);
  assert.equal(calculateAtwaterCalories({
    carbsG: 22.8,
    proteinG: 1.3,
    fatG: 0.1,
  }), 97);
});

test("ovo cozido ~50g: 0,6 C + 6,3 P + 5,3 G ≈ 75 kcal", () => {
  assert.equal(calculateAtwaterCalories({
    carbsG: 0.6,
    proteinG: 6.3,
    fatG: 5.3,
  }), 75);
});

test("rótulo industrializado: 15 C + 5 P + 2 G = 98 kcal", () => {
  assert.equal(calculateAtwaterCaloriesRaw({
    carbsG: 15,
    proteinG: 5,
    fatG: 2,
  }), 98);
});

test("álcool entra com fator 7 kcal/g", () => {
  assert.equal(calculateAtwaterCalories({
    carbsG: 0,
    proteinG: 0,
    fatG: 0,
    alcoholG: 10,
  }), 70);
});
