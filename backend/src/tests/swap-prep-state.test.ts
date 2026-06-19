import test from "node:test";
import assert from "node:assert/strict";
import {
  isPreparationSwapAllowed,
  resolvePrepState,
  scorePreparationSwapFit,
} from "../services/bella/swap-prep-state";

test("resolvePrepState: sopa é preparado/cozido", () => {
  assert.equal(resolvePrepState("sopa cheia(s) (100g)"), "cooked");
});

test("resolvePrepState: batata crua é cru", () => {
  assert.equal(resolvePrepState("Batata, inglesa, crua"), "raw");
});

test("resolvePrepState: batata cozida é cozido", () => {
  assert.equal(resolvePrepState("Batata, inglesa, cozida"), "cooked");
});

test("isPreparationSwapAllowed: bloqueia cru para sopa", () => {
  assert.equal(
    isPreparationSwapAllowed("sopa cheia(s) (100g)", "Batata, inglesa, crua"),
    false,
  );
  assert.equal(
    isPreparationSwapAllowed("sopa cheia(s) (100g)", "Macarrão, trigo, cru"),
    false,
  );
});

test("isPreparationSwapAllowed: permite cozido para sopa", () => {
  assert.equal(
    isPreparationSwapAllowed("sopa cheia(s) (100g)", "Batata, inglesa, cozida"),
    true,
  );
});

test("scorePreparationSwapFit: prioriza cozida sobre crua para sopa", () => {
  const cozida = scorePreparationSwapFit(
    "sopa cheia(s) (100g)",
    "Batata, inglesa, cozida",
  );
  const crua = scorePreparationSwapFit(
    "sopa cheia(s) (100g)",
    "Batata, inglesa, crua",
  );
  assert.ok(cozida > crua);
});
