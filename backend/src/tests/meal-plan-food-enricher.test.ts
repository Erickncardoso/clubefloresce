import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ParsedFoodItem, ParsedMealPlan } from "../types/meal-plan.types";
import {
  foodItemNeedsEnrichment,
  parsedMealPlanNeedsFoodEnrichment,
  resolveFoodMatchName,
  sanitizeParsedFoodItem,
} from "../services/meal-plan/meal-plan-food-enricher";

describe("meal-plan-food-enricher", () => {
  it("resolveFoodMatchName extrai nome do display Dietbox", () => {
    const item: ParsedFoodItem = {
      key: "ovo",
      name: "com mussarela Ovo de galinha",
      amount: 1,
      unit: "unidade",
      grams: 50,
      ml: null,
      display: "Ovo de galinha 1 Unidade(s) (50g)",
      substitutions: [],
    };

    assert.equal(resolveFoodMatchName(item), "Ovo de galinha");
  });

  it("sanitizeParsedFoodItem corrige name e grams a partir do display", () => {
    const sanitized = sanitizeParsedFoodItem({
      key: "ovo",
      name: "com mussarela Ovo de galinha",
      amount: 1,
      unit: "unidade",
      grams: 100,
      ml: null,
      display: "Ovo de galinha 1 Unidade(s) (50g)",
      substitutions: [],
    });

    assert.equal(sanitized.name, "Ovo de galinha");
    assert.equal(sanitized.grams, 50);
  });

  it("foodItemNeedsEnrichment detecta item sem foodId ou per100g", () => {
    assert.equal(
      foodItemNeedsEnrichment({
        key: "a",
        name: "Banana",
        amount: 1,
        unit: "unidade",
        grams: 90,
        ml: null,
        display: "Banana 1 Unidade(s) (90g)",
        substitutions: [],
      }),
      true,
    );

    assert.equal(
      foodItemNeedsEnrichment({
        key: "b",
        name: "Banana",
        amount: 1,
        unit: "unidade",
        grams: 90,
        ml: null,
        display: "Banana 1 Unidade(s) (90g)",
        substitutions: [],
        foodId: "taco-banana",
        per100g: { caloriesKcal: 98, proteinG: 1, carbsG: 26, fatG: 0 },
      }),
      false,
    );
  });

  it("parsedMealPlanNeedsFoodEnrichment inclui substituicoes", () => {
    const plan: ParsedMealPlan = {
      title: "Teste",
      patientName: "Paciente",
      prescribedAt: null,
      fileName: "test.pdf",
      parserSource: "dietbox",
      nutritionTotals: { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      meals: [
        {
          id: "lanche",
          time: "15:30",
          label: "Lanche",
          items: [
            {
              key: "queijo",
              name: "Queijo muçarela",
              amount: 2,
              unit: "fatia",
              grams: 25,
              ml: null,
              display: "Queijo muçarela 2 Fatia(s) (25g)",
              substitutions: [
                {
                  key: "sub-ovo",
                  name: "Ovo de galinha",
                  amount: 1,
                  unit: "unidade",
                  grams: 50,
                  ml: null,
                  display: "Ovo de galinha 1 Unidade(s) (50g)",
                  substitutions: [],
                },
              ],
              foodId: "linked",
              per100g: { caloriesKcal: 200, proteinG: 10, carbsG: 2, fatG: 15 },
            },
          ],
        },
      ],
    };

    assert.equal(parsedMealPlanNeedsFoodEnrichment(plan), true);
  });
});
