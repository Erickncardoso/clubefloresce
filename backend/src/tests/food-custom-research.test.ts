import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseOffMacros,
  parseUsdaMacros,
} from "../services/food-custom-research.service";
import { isAbsurdFoodMatch, sanitizeResearchedPer100g } from "../utils/food-match-guards";

describe("food-custom-research parsers", () => {
  it("parseia macros 100g do Open Food Facts com Atwater", () => {
    const macros = parseOffMacros({
      code: "7891000100103",
      product_name: "Requeijão Cremoso Light",
      brands: "Danúbio",
      nutriments: {
        "energy-kcal_100g": 145,
        proteins_100g: 10.5,
        carbohydrates_100g: 3.2,
        fat_100g: 10,
        fiber_100g: 0,
        sodium_100g: 0.42,
      },
    });

    assert.ok(macros);
    // 10.5*4 + 3.2*4 + 10*9 = 145
    assert.equal(macros!.caloriesKcal, 145);
    assert.equal(macros!.proteinG, 10.5);
    assert.equal(macros!.sodiumMg, 420);
    assert.equal(macros!.source, "openfoodfacts");
  });

  it("recusa OFF sem *_100g completos e ignora porção", () => {
    assert.equal(
      parseOffMacros({
        product_name: "Sem dados",
        nutriments: { "energy-kcal_100g": 100 },
      }),
      null,
    );
    assert.equal(
      parseOffMacros({
        product_name: "Só porção",
        nutriments: {
          "energy-kcal": 116,
          proteins: 27,
          carbohydrates: 2,
          fat: 0,
        },
      }),
      null,
    );
  });

  it("converte energia USDA em kJ e usa Atwater", () => {
    const macros = parseUsdaMacros(
      {
        fdcId: 168482,
        description: "Potato, baked, flesh, without salt",
        foodNutrients: [
          { nutrientName: "Energy", value: 389, unitName: "KJ" },
          { nutrientName: "Protein", value: 1.9, unitName: "G" },
          { nutrientName: "Carbohydrate, by difference", value: 21.2, unitName: "G" },
          { nutrientName: "Total lipid (fat)", value: 0.1, unitName: "G" },
        ],
      },
      "batata inglesa assada",
    );
    assert.ok(macros);
    // Atwater: 1.9*4 + 21.2*4 + 0.1*9 ≈ 93
    assert.ok(macros!.caloriesKcal >= 85 && macros!.caloriesKcal <= 100);
  });

  it("recusa sweet potato para batata inglesa", () => {
    assert.equal(
      parseUsdaMacros(
        {
          fdcId: 1,
          description: "Sweet potato, raw, unprepared",
          foodNutrients: [
            { nutrientName: "Energy", value: 86, unitName: "KCAL" },
            { nutrientName: "Protein", value: 1.6, unitName: "G" },
            { nutrientName: "Carbohydrate, by difference", value: 20.1, unitName: "G" },
            { nutrientName: "Total lipid (fat)", value: 0.1, unitName: "G" },
          ],
        },
        "batata inglesa assada",
      ),
      null,
    );
  });
});

describe("food-match-guards", () => {
  it("bloqueia óleo para quinoa e corrige kJ", () => {
    assert.equal(
      isAbsurdFoodMatch("Quinoa cozida", "Óleo, linhaça (dado importado)", {
        caloriesKcal: 899,
        fatG: 99.8,
        proteinG: 0.1,
        carbsG: 0,
      }),
      true,
    );

    const fixed = sanitizeResearchedPer100g({
      caloriesKcal: 359,
      proteinG: 1.6,
      carbsG: 20.1,
      fatG: 0.1,
      fiberG: 3,
    });
    assert.ok(fixed);
    assert.ok(fixed!.caloriesKcal < 120);
  });
});
