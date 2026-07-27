import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cutInlineSectionText,
  looksLikeFoodPortionLine,
  sanitizeMealPlanSubstitutions,
} from "../meal-plan-text-sanitize";
import { parseDietboxMealPlan } from "../dietbox-parser";

describe("meal-plan-text-sanitize", () => {
  it("corta observações e receitas coladas no display", () => {
    const dirty =
      "Chocolate amargo 50% cacau - 2 Quadradinho(s) (10g) Observações: Strogonoff caseiro fit Ingredientes: frango";

    assert.equal(
      cutInlineSectionText(dirty),
      "Chocolate amargo 50% cacau - 2 Quadradinho(s) (10g)",
    );
    assert.equal(looksLikeFoodPortionLine(dirty), true);
    assert.equal(
      looksLikeFoodPortionLine("Strogonoff caseiro fit Ingredientes: azeite"),
      false,
    );
  });

  it("rejeita rodapé/relatório Dietbox colado como item", () => {
    const footerBlob =
      "Nutricionista CRN 66152 nutri.isabellajardim@gmail.com Página 3/4 | Paciente Isabella Jardim | Prescrito em: 16/04/2026 Relatório de nutrientes Refeição Proteínas Lipídeos Carboidratos Calorias Café da manhã 23.8g 20.9g 53.2g 489 Kcal Total das refeições 145.9g 46.1g 151.9g 1571 Kcal Vitamina E Álcool 5.2mg 0.0g";

    assert.equal(looksLikeFoodPortionLine(footerBlob), false);

    const glued =
      "Mix de legumes 2 colher(es) de arroz cheia(s) (140g) Nutricionista CRN 66152 Relatório de nutrientes Total das refeições 145.9g 46.1g 151.9g 1571 Kcal";
    assert.equal(
      cutInlineSectionText(glued),
      "Mix de legumes 2 colher(es) de arroz cheia(s) (140g)",
    );
    assert.equal(looksLikeFoodPortionLine(cutInlineSectionText(glued)), true);
  });

  it("remove substituições inválidas do plano", () => {
    const plan = {
      title: "Teste",
      patientName: null,
      prescribedAt: null,
      fileName: "x.pdf",
      parserSource: "dietbox" as const,
      meals: [{
        id: "m1",
        time: "08:00",
        label: "Café",
        items: [{
          key: "a",
          name: "Pão",
          amount: 1,
          unit: "un",
          grams: 50,
          ml: null,
          display: "Pão 1 un (50g)",
          substitutions: [
            {
              key: "b",
              name: "Torrada",
              amount: 12,
              unit: "un",
              grams: 36,
              ml: null,
              display:
                "Torrada light - 12 Unidade(s) (36g) Observações: Pão de cuscuz Misture o ovo com o cuscuz",
              substitutions: [],
            },
            {
              key: "c",
              name: "Morango",
              amount: 10,
              unit: "un",
              grams: 200,
              ml: null,
              display: "Morango - 10 unidade(s) (200g)",
              substitutions: [],
            },
          ],
        }],
      }],
    };

    sanitizeMealPlanSubstitutions(plan);
    assert.equal(plan.meals[0].items[0].substitutions.length, 2);
    assert.match(plan.meals[0].items[0].substitutions[0].display, /Torrada light/);
    assert.doesNotMatch(plan.meals[0].items[0].substitutions[0].display, /Observa/i);
  });
});

describe("parseDietboxMealPlan substitution boundaries", () => {
  it("não inclui observações/receitas nas substituições", () => {
    const text = `
06:15 - Café da manhã
Trento mini avelã 2 unidades (16g)
• Opcões de substituição para Trento mini avelã:
Abacaxi - 2 fatia(s) pequena(s) (150g) - ou - Morango - 10 unidade(s) (200g) - ou - Chocolate amargo 50% cacau - 2 Quadradinho(s) (10g)
Observações:
Strogonoff caseiro fit
Ingredientes: 1 kg peito de frango
Modo de preparo: refogue a cebola
19:00 - Jantar
Arroz 100g
`;

    const plan = parseDietboxMealPlan(text, "test.pdf");
    const breakfast = plan.meals.find((m) => m.label.includes("Café"));
    assert.ok(breakfast);
    const item = breakfast!.items.find((i) => i.name.toLowerCase().includes("trento"));
    assert.ok(item?.substitutions?.length);
    for (const sub of item!.substitutions) {
      assert.doesNotMatch(sub.display, /Strogonoff|Modo de preparo|Ingredientes/i);
      assert.doesNotMatch(sub.display, /Observa/i);
    }
  });

  it("não cria item com relatório de nutrientes colado no PDF", () => {
    const text = `
19:00 - Jantar
Mix de legumes 2 colher(es) de arroz cheia(s) (140g) Nutricionista CRN 66152 nutri.isabellajardim@gmail.com Página 3/4 | Paciente Isabella Jardim | Prescrito em: 16/04/2026 Relatório de nutrientes Refeição Proteínas Lipídeos Carboidratos Calorias Café da manhã 23.8g 20.9g 53.2g 489 Kcal Total das refeições 145.9g 46.1g 151.9g 1571 Kcal Vitamina E Álcool 5.2mg 0.0g
`;

    const plan = parseDietboxMealPlan(text, "test.pdf");
    const dinner = plan.meals.find((m) => m.label.includes("Jantar"));
    assert.ok(dinner);
    assert.equal(dinner!.items.length, 1);
    assert.match(dinner!.items[0].display, /Mix de legumes/);
    assert.doesNotMatch(dinner!.items[0].display, /CRN|Relatório de nutrientes|1571 Kcal/i);
  });
});
