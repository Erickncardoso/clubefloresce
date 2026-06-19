import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import path from "path";
import { parseDietboxMealPlan } from "../dietbox-parser";

const samplePath = path.resolve(
  process.cwd(),
  "../frontend/tests/fixtures/planejamento-sample.txt",
);

const isabellaPath = path.resolve(
  process.cwd(),
  "../frontend/tests/fixtures/planejamento-isabella-jardim.txt",
);

describe("parseDietboxMealPlan", () => {
  it("extrai refeições, itens e substituições do PDF de exemplo", () => {
    const text = readFileSync(samplePath, "utf8");
    const plan = parseDietboxMealPlan(text, "planejamento.php.pdf");

    assert.ok(plan.meals.length >= 6);
    assert.equal(plan.title, "Cardápio low carb");
    assert.equal(plan.patientName, "Victoria Silva Barreto");

    const breakfast = plan.meals.find((meal) => meal.label.includes("Café"));
    assert.ok(breakfast);
    assert.equal(breakfast!.items.length, 5);
  });

  it("extrai refeições, macros e total calórico da prescrição Isabella Jardim", () => {
    const text = readFileSync(isabellaPath, "utf8");
    const plan = parseDietboxMealPlan(text, "Plano alimentar - Isabella Jardim.pdf");

    assert.equal(plan.patientName, "Isabella Jardim");
    assert.equal(plan.meals.length, 4);

    const breakfast = plan.meals.find((meal) => meal.label.includes("Café"));
    assert.ok(breakfast);
    assert.equal(breakfast!.items.length, 5);
    assert.equal(breakfast!.macros?.caloriesKcal, 489);

    const lunch = plan.meals.find((meal) => meal.label.includes("Almoço"));
    assert.ok(lunch);
    assert.equal(lunch!.items.length, 4);
    assert.ok(lunch!.items.some((item) => item.name.includes("Peito de frango")));

    assert.deepEqual(plan.nutritionTotals, {
      proteinG: 145.9,
      fatG: 46.1,
      carbsG: 151.9,
      caloriesKcal: 1571,
    });
  });
});
