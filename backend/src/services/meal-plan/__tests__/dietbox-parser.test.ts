import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import path from "path";
import { parseDietboxMealPlan } from "../dietbox-parser";

const fixturePath = path.resolve(
  process.cwd(),
  "../frontend/tests/fixtures/planejamento-sample.txt",
);

describe("parseDietboxMealPlan", () => {
  it("extrai refeições, itens e substituições do PDF de exemplo", () => {
    const text = readFileSync(fixturePath, "utf8");
    const plan = parseDietboxMealPlan(text, "planejamento.php.pdf");

    assert.ok(plan.meals.length >= 6);
    assert.equal(plan.title, "Cardápio low carb");
    assert.equal(plan.patientName, "Victoria Silva Barreto");

    const breakfast = plan.meals.find((meal) => meal.label.includes("Café"));
    assert.ok(breakfast);
    assert.equal(breakfast!.items.length, 5);

    const bread = breakfast!.items.find((item) => item.name.includes("Pão de forma integral"));
    assert.ok(bread);
    assert.equal(bread!.grams, 25);
    assert.equal(bread!.substitutions.length, 1);
    assert.match(bread!.substitutions[0].display, /Farelo de aveia/i);

    const papaya = breakfast!.items.find((item) => item.name.includes("Mamão"));
    assert.ok(papaya);
    assert.ok(papaya!.substitutions.length >= 8);
  });
});
