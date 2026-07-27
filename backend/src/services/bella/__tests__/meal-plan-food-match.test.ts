import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ensureFoodOverridesSeeded } from "../../food-overrides.service";
import { smartMatchFood } from "../../food-smart-match.service";

describe("smartMatchFood — plano Isabella", () => {
  it("Mix de legumes usa CUSTOM refogado, não castanhas", async () => {
    await ensureFoodOverridesSeeded();

    const matched = await smartMatchFood("Mix de legumes", {
      originalName: "Mix de legumes 2 colher(es) de arroz cheia(s) (140g)",
    });

    assert.ok(matched);
    assert.equal(matched!.source, "CUSTOM");
    assert.match(matched!.name, /Mix de legumes/i);
    assert.ok(matched!.per100g.caloriesKcal! < 120);
    assert.equal(Math.round(matched!.per100g.caloriesKcal! * 140 / 100), 73);
  });

  it("Banana usa TBCA in natura, não doce em barra", async () => {
    const matched = await smartMatchFood("Banana", {
      originalName: "Banana 1 Unidade(s) grande(s) (100g)",
    });

    assert.ok(matched);
    assert.equal(matched!.source, "TBCA");
    assert.match(matched!.name, /in natura/i);
    assert.ok(matched!.per100g.caloriesKcal! < 150);
  });
});
