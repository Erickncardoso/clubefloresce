import test from "node:test";
import assert from "node:assert/strict";
import {
  isCulinarySwapAllowed,
  resolveCarbRole,
  resolveMealPeriod,
  scoreCulinarySwapFit,
} from "../services/bella/swap-culinary-fit";

test("resolveCarbRole: arroz é carboidrato de refeição principal", () => {
  assert.equal(resolveCarbRole("Arroz, branco, cozido"), "meal_staple");
});

test("resolveCarbRole: canjica é cereal de café da manhã", () => {
  assert.equal(resolveCarbRole("Canjica, cozida"), "breakfast_cereal");
});

test("resolveMealPeriod: identifica almoço", () => {
  assert.equal(resolveMealPeriod("Almoço", "lunch"), "lunch");
});

test("isCulinarySwapAllowed: bloqueia arroz por canjica no almoço", () => {
  assert.equal(
    isCulinarySwapAllowed(
      "Arroz, branco, 4 colheres",
      "Canjica, cozida",
      "lunch",
      "carb_rich",
    ),
    false,
  );
});

test("isCulinarySwapAllowed: permite arroz por batata no almoço", () => {
  assert.equal(
    isCulinarySwapAllowed(
      "Arroz, branco, 4 colheres",
      "Batata, inglesa, cozida",
      "lunch",
      "carb_rich",
    ),
    true,
  );
});

test("isCulinarySwapAllowed: permite arroz por feijão no almoço", () => {
  assert.equal(
    isCulinarySwapAllowed(
      "Arroz, branco, 4 colheres",
      "Feijão, carioca, cozido",
      "lunch",
      "carb_rich",
    ),
    true,
  );
});

test("scoreCulinarySwapFit: prioriza batata sobre canjica para arroz no almoço", () => {
  const batata = scoreCulinarySwapFit(
    "Arroz, branco",
    "Batata, inglesa, cozida",
    "lunch",
  );
  const canjica = scoreCulinarySwapFit(
    "Arroz, branco",
    "Canjica, cozida",
    "lunch",
  );
  assert.ok(batata > canjica);
});
