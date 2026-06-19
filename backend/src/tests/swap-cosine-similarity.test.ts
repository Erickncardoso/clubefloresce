import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNutrientVector,
  cosineSimilarity,
  normalizeVectorToEnergyBase,
  scoreNutritionalSimilarity,
  similarityToPercent,
} from "../utils/swap-cosine-similarity";

test("retorna 1 para vetores idênticos normalizados", () => {
  const vector = buildNutrientVector(
    { caloriesKcal: 130, carbsG: 28, proteinG: 2.7, fatG: 0.3, energyPolicy: "atwater" },
    100,
    1.3,
  );
  const score = scoreNutritionalSimilarity(vector, vector);
  assert.ok(Math.abs(score - 1) < 0.00001);
  assert.equal(similarityToPercent(score), 100);
});

test("dá maior similaridade para perfis próximos do que distantes", () => {
  const arroz = buildNutrientVector(
    { caloriesKcal: 130, carbsG: 28, proteinG: 2.7, fatG: 0.3, energyPolicy: "atwater" },
    100,
  );
  const macarrao = buildNutrientVector(
    { caloriesKcal: 131, carbsG: 25, proteinG: 5, fatG: 1.1, energyPolicy: "atwater" },
    100,
  );
  const frango = buildNutrientVector(
    { caloriesKcal: 165, carbsG: 0, proteinG: 31, fatG: 3.6, energyPolicy: "atwater" },
    100,
  );

  const scoreMacarrao = scoreNutritionalSimilarity(arroz, macarrao);
  const scoreFrango = scoreNutritionalSimilarity(arroz, frango);

  assert.ok(scoreMacarrao > scoreFrango);
});

test("normaliza vetores para mesma base calórica antes de comparar", () => {
  const small = buildNutrientVector(
    { caloriesKcal: 130, carbsG: 28, proteinG: 2.7, fatG: 0.3, energyPolicy: "atwater" },
    50,
  );
  const large = buildNutrientVector(
    { caloriesKcal: 130, carbsG: 28, proteinG: 2.7, fatG: 0.3, energyPolicy: "atwater" },
    200,
  );

  const normalizedSmall = normalizeVectorToEnergyBase(small);
  const normalizedLarge = normalizeVectorToEnergyBase(large);

  const similarity = cosineSimilarity(
    [normalizedSmall.carbsG, normalizedSmall.proteinG, normalizedSmall.fatG, normalizedSmall.fiberG],
    [normalizedLarge.carbsG, normalizedLarge.proteinG, normalizedLarge.fatG, normalizedLarge.fiberG],
  );

  assert.ok(Math.abs(similarity - 1) < 0.00001);
});
