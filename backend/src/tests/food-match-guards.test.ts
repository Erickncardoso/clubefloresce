import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeResearchedPer100g, isAbsurdFoodMatch } from "../utils/food-match-guards";

// Keep a tiny dedicated suite in case research service import is heavy.
describe("sanitizeResearchedPer100g", () => {
  it("nunca deixa kcal 4x maior que Atwater", () => {
    const fixed = sanitizeResearchedPer100g({
      caloriesKcal: 359,
      proteinG: 1.6,
      carbsG: 20.1,
      fatG: 0.1,
      fiberG: 3,
    });
    assert.ok(fixed);
    assert.ok(fixed!.caloriesKcal < 120, `got ${fixed!.caloriesKcal}`);
  });

  it("rejeita macros impossíveis", () => {
    assert.equal(
      sanitizeResearchedPer100g({
        caloriesKcal: 500,
        proteinG: 50,
        carbsG: 50,
        fatG: 50,
      }),
      null,
    );
  });
});

describe("isAbsurdFoodMatch", () => {
  it("quinoa não vira óleo", () => {
    assert.equal(
      isAbsurdFoodMatch("Quinoa cozida", "Óleo, linhaça", { fatG: 99, caloriesKcal: 899, proteinG: 0, carbsG: 0 }),
      true,
    );
  });

  it("sem óleo no nome do ovo não libera match com óleo", () => {
    assert.equal(
      isAbsurdFoodMatch("Ovo de galinha mexido/frito sem oleo", "Óleo, linhaça", {
        fatG: 99.8,
        caloriesKcal: 899,
        proteinG: 0,
        carbsG: 0,
      }),
      true,
    );
  });

  it("banana plain não vira caramelada", () => {
    assert.equal(
      isAbsurdFoodMatch("Banana", "Banana, cozida, caramelada", {
        caloriesKcal: 181,
        proteinG: 1,
        carbsG: 42.9,
        fatG: 0.2,
      }),
      true,
    );
  });

  it("maçã plain não vira doce/processado", () => {
    assert.equal(
      isAbsurdFoodMatch("Maçã", "Maçã, doce em barra", {
        caloriesKcal: 280,
        proteinG: 1,
        carbsG: 70,
        fatG: 0,
      }),
      true,
    );
  });

  it("maçã não vira macadâmia nem macaúba", () => {
    assert.equal(isAbsurdFoodMatch("Maçã", "Macadâmia, crua, s/ sal"), true);
    assert.equal(isAbsurdFoodMatch("Maçã", "Macaúba, in natura"), true);
  });

  it("carne alcatra não vira linguiça", () => {
    assert.equal(
      isAbsurdFoodMatch(
        "Carne (alcatra, contrafilé, coxão mole) cozida/grelhada",
        "Lingüiça, porco, grelhada",
      ),
      true,
    );
  });

  it("frango desfiado não vira salpicão nem atum", () => {
    assert.equal(isAbsurdFoodMatch("Frango desfiado", "Salpicão, de frango"), true);
    assert.equal(isAbsurdFoodMatch("Frango desfiado", "Atum, conserva em óleo"), true);
  });

  it("couve não vira couve-rábano", () => {
    assert.equal(
      isAbsurdFoodMatch("Couve (couve-manteiga)", "Couve rábano (nabo alemão), crua"),
      true,
    );
  });

  it("molho de tomate não vira sardinha", () => {
    assert.equal(
      isAbsurdFoodMatch("Molho de tomate caseiro com sal", "SARDINAS EN SALSA DE TOMATE POICANTE"),
      true,
    );
  });

  it("requeijão não vira salsicha e tapioca massa não vira recheada", () => {
    assert.equal(isAbsurdFoodMatch("Requeijão Cremoso Light", "Salsicha, light"), true);
    assert.equal(
      isAbsurdFoodMatch("Tapioca (Massa Pronta)", "Tapioca, c/ queijo coalho e muçarela"),
      true,
    );
  });

  it("morango não vira creme de inhame", () => {
    assert.equal(
      isAbsurdFoodMatch("Morango", "Creme de inhame com morango, s/ açúcar"),
      true,
    );
  });

  it("parmegiana / milanesa não vira pinhão", () => {
    assert.equal(isAbsurdFoodMatch("Frango à parmegiana", "Pinhão, cozido"), true);
    assert.equal(isAbsurdFoodMatch("Bife milanesa", "Castanha-do-pará, crua"), true);
    assert.equal(isAbsurdFoodMatch("Pinhão", "Frango à parmegiana"), true);
  });
});
