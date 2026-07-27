import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeMeals,
  groupMealOptions,
  needsMealOptionSelection,
  normalizeMealSlotKey,
  validateSelectedMealBySlot,
} from "../utils/meal-plan-options";
import type { ParsedMeal } from "../types/meal-plan.types";

function meal(partial: Partial<ParsedMeal> & Pick<ParsedMeal, "id" | "label">): ParsedMeal {
  return {
    time: "16:00",
    items: [],
    ...partial,
  };
}

describe("meal-plan-options", () => {
  it("normaliza labels iguais em um slotKey", () => {
    assert.equal(normalizeMealSlotKey("Lanche da tarde"), normalizeMealSlotKey("lanche da tarde"));
    assert.equal(normalizeMealSlotKey("Lanche da tarde - Opção 2"), "lanche-da-tarde");
    assert.equal(
      normalizeMealSlotKey("Lanche da tarde - Opção 1: Panqueca de banana proteica"),
      "lanche-da-tarde",
    );
    assert.equal(
      normalizeMealSlotKey("Lanche da tarde - Opção 3: Tapioca"),
      normalizeMealSlotKey("Lanche da tarde - Opção 2: Pão com patê"),
    );
    assert.equal(normalizeMealSlotKey("Jantar - Opção 1"), "jantar");
    assert.equal(normalizeMealSlotKey("Jantar - opção 2: Pizza de frigideira"), "jantar");
  });

  it("agrupa só slots com 2+ opções", () => {
    const meals = [
      meal({ id: "a", label: "Almoço", time: "12:00" }),
      meal({ id: "b1", label: "Lanche da tarde - Opção 1: Panqueca", time: "15:00" }),
      meal({ id: "b2", label: "Lanche da tarde - Opção 2: Pão", time: "15:00" }),
      meal({ id: "b3", label: "Lanche da tarde - Opção 3: Tapioca", time: "15:00" }),
      meal({ id: "j1", label: "Jantar - Opção 1", time: "12:00" }),
      meal({ id: "j2", label: "Jantar - opção 2: Pizza", time: "19:00" }),
    ];
    const groups = groupMealOptions(meals);
    assert.equal(groups.length, 2);
    const lanche = groups.find((g) => g.slotKey === "lanche-da-tarde");
    const jantar = groups.find((g) => g.slotKey === "jantar");
    assert.equal(lanche?.options.length, 3);
    assert.equal(jantar?.options.length, 2);
  });

  it("filtra meals ativas pela seleção", () => {
    const meals = [
      meal({ id: "a", label: "Almoço", time: "12:00" }),
      meal({ id: "b1", label: "Lanche da tarde", time: "15:00" }),
      meal({ id: "b2", label: "Lanche da tarde", time: "16:00" }),
    ];
    const active = activeMeals(meals, { "lanche-da-tarde": "b2" });
    assert.deepEqual(active.map((item) => item.id), ["a", "b2"]);
  });

  it("detecta seleção pendente e valida payload", () => {
    const meals = [
      meal({ id: "b1", label: "Lanche da tarde" }),
      meal({ id: "b2", label: "Lanche da tarde" }),
    ];
    assert.equal(needsMealOptionSelection(meals, {}), true);
    assert.equal(needsMealOptionSelection(meals, { "lanche-da-tarde": "b1" }), false);
    assert.deepEqual(
      validateSelectedMealBySlot(meals, { "lanche-da-tarde": "b2" }),
      { "lanche-da-tarde": "b2" },
    );
    assert.throws(() => validateSelectedMealBySlot(meals, { "lanche-da-tarde": "x" }));
  });
});
