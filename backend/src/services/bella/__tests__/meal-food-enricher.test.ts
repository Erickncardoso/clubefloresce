import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveEnrichedDisplayName } from "../meal-food-enricher";
import type { MealItemDraft } from "../../../types/food-diary.types";
import type { FoodItemDto } from "../../../types/food.types";

const customFood: FoodItemDto = {
  id: "custom-oats",
  source: "CUSTOM",
  sourceCode: "OATS_FLAKES",
  name: "Aveia em flocos",
  category: "Cereais",
  nutrients: { per100g: {} },
  per100g: {
    caloriesKcal: 389,
    proteinG: 16.9,
    carbsG: 66.3,
    fatG: 6.9,
    fiberG: 10.6,
    sodiumMg: 2,
  },
};

const tbcaFood: FoodItemDto = {
  ...customFood,
  id: "tbca-banana",
  source: "TBCA",
  sourceCode: "BANANA",
  name: "Banana, nanica, in natura, crua",
};

describe("resolveEnrichedDisplayName", () => {
  it("mantém o texto do PDF quando o match é CUSTOM", () => {
    const item: MealItemDraft = {
      id: "1",
      name: "Aveia em flocos",
      grams: 20,
      caloriesKcal: 0,
      carbsG: 0,
      proteinG: 0,
      fatG: 0,
      originalName: "Aveia em flocos 20g",
    };

    assert.equal(
      resolveEnrichedDisplayName(item, customFood),
      "Aveia em flocos 20g",
    );
  });

  it("usa o nome canônico da tabela quando o match é TBCA/TACO", () => {
    const item: MealItemDraft = {
      id: "2",
      name: "Banana",
      grams: 100,
      caloriesKcal: 0,
      carbsG: 0,
      proteinG: 0,
      fatG: 0,
      originalName: "Banana 1 Unidade(s) grande(s) (100g)",
    };

    assert.equal(
      resolveEnrichedDisplayName(item, tbcaFood),
      "Banana, nanica, in natura, crua",
    );
  });
});
