import test from "node:test";
import assert from "node:assert/strict";
import {
  getSubstituteFamilyKey,
  pickDiverseSubstitutionSuggestions,
  isCalorieSubstitutionCandidateAllowed,
} from "../utils/calorie-substitution-ranking";
import type { SubstitutionFoodResult } from "../services/food-substitution.service";

test("getSubstituteFamilyKey: separa famílias comuns", () => {
  assert.equal(getSubstituteFamilyKey("Arroz, branco, cozido"), "arroz");
  assert.equal(getSubstituteFamilyKey("Batata, inglesa, cozida"), "batata");
  assert.equal(getSubstituteFamilyKey("Mandioca, cozida"), "mandioca");
});

test("pickDiverseSubstitutionSuggestions: evita repetir arroz e preenche além das famílias", () => {
  const ranked = [
    {
      id: "1",
      name: "Arroz, integral, cozido",
      category: "Cereais e derivados",
      grams: 90,
      macros: { grams: 90, caloriesKcal: 100, carbsG: 20, proteinG: 2, fatG: 1 },
      similarityPercent: 95,
      per100g: { caloriesKcal: 120, carbsG: 25, proteinG: 3, fatG: 1, fiberG: 1 },
    },
    {
      id: "2",
      name: "Batata, inglesa, cozida",
      category: "Verduras, hortaliças e derivados",
      grams: 130,
      macros: { grams: 130, caloriesKcal: 100, carbsG: 22, proteinG: 2, fatG: 0 },
      similarityPercent: 88,
      per100g: { caloriesKcal: 80, carbsG: 18, proteinG: 2, fatG: 0, fiberG: 2 },
    },
    {
      id: "3",
      name: "Mandioca, cozida",
      category: "Verduras, hortaliças e derivados",
      grams: 80,
      macros: { grams: 80, caloriesKcal: 100, carbsG: 24, proteinG: 1, fatG: 0 },
      similarityPercent: 86,
      per100g: { caloriesKcal: 125, carbsG: 30, proteinG: 1, fatG: 0, fiberG: 1 },
    },
    {
      id: "4",
      name: "Macarrão, trigo, cozido",
      category: "Cereais e derivados",
      grams: 70,
      macros: { grams: 70, caloriesKcal: 100, carbsG: 20, proteinG: 3, fatG: 1 },
      similarityPercent: 84,
      per100g: { caloriesKcal: 140, carbsG: 28, proteinG: 5, fatG: 1, fiberG: 2 },
    },
    {
      id: "5",
      name: "Feijão, carioca, cozido",
      category: "Leguminosas e derivados",
      grams: 85,
      macros: { grams: 85, caloriesKcal: 100, carbsG: 18, proteinG: 7, fatG: 0 },
      similarityPercent: 80,
      per100g: { caloriesKcal: 120, carbsG: 20, proteinG: 8, fatG: 0, fiberG: 6 },
    },
  ];

  const picked = pickDiverseSubstitutionSuggestions(ranked, "Arroz, branco, cozido", 5);
  assert.equal(picked.length, 4);
  assert.ok(picked.every((item: SubstitutionFoodResult) => !/arroz/i.test(item.name)));
  assert.ok(picked.some((item: SubstitutionFoodResult) => /batata/i.test(item.name)));
  assert.ok(picked.some((item: SubstitutionFoodResult) => /feij[aã]o/i.test(item.name)));
});

test("isCalorieSubstitutionCandidateAllowed: bloqueia outra variedade de arroz", () => {
  const original = {
    id: "orig",
    name: "Arroz, branco, cozido",
    category: "Cereais e derivados",
    source: "TBCA" as const,
    sourceCode: "X",
    nutrients: { per100g: {} },
    per100g: { caloriesKcal: 130, carbsG: 28, proteinG: 2, fatG: 0, fiberG: 1, sodiumMg: 0 },
  };
  const sameFamily = {
    ...original,
    id: "other",
    name: "Arroz, parboilizado, cozido",
  };

  assert.equal(
    isCalorieSubstitutionCandidateAllowed(original, sameFamily, "lunch", "carb_rich"),
    false,
  );
});

test("isCalorieSubstitutionCandidateAllowed: permite batata e feijão para arroz", () => {
  const original = {
    id: "orig",
    name: "Arroz, branco, cozido",
    category: "Cereais e derivados",
    source: "TBCA" as const,
    sourceCode: "X",
    nutrients: { per100g: {} },
    per100g: { caloriesKcal: 130, carbsG: 28, proteinG: 2, fatG: 0, fiberG: 1, sodiumMg: 0 },
  };
  const batata = {
    ...original,
    id: "bat",
    name: "Batata, inglesa, cozida",
    category: "Verduras, hortaliças e derivados",
    per100g: { caloriesKcal: 80, carbsG: 18, proteinG: 2, fatG: 0, fiberG: 2, sodiumMg: 0 },
  };
  const feijao = {
    ...original,
    id: "fej",
    name: "Feijão, carioca, cozido",
    category: "Leguminosas e derivados",
    per100g: { caloriesKcal: 120, carbsG: 20, proteinG: 8, fatG: 0, fiberG: 6, sodiumMg: 0 },
  };

  assert.equal(
    isCalorieSubstitutionCandidateAllowed(original, batata, "any", "carb_rich"),
    true,
  );
  assert.equal(
    isCalorieSubstitutionCandidateAllowed(original, feijao, "any", "carb_rich"),
    true,
  );
});

test("isCalorieSubstitutionCandidateAllowed: bloqueia baunilha para arroz", () => {
  const original = {
    id: "orig",
    name: "Arroz, branco, cozido",
    category: "Cereais e derivados",
    source: "TBCA" as const,
    sourceCode: "X",
    nutrients: { per100g: {} },
    per100g: { caloriesKcal: 130, carbsG: 28, proteinG: 2, fatG: 0, fiberG: 1, sodiumMg: 0 },
  };
  const baunilha = {
    ...original,
    id: "van",
    name: "Essência de baunilha",
    category: "Miscelâneas",
  };

  assert.equal(
    isCalorieSubstitutionCandidateAllowed(original, baunilha, "any", "carb_rich"),
    false,
  );
});
