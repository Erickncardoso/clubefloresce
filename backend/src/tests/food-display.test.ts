import test from "node:test";
import assert from "node:assert/strict";
import { formatFoodDisplayName } from "../utils/food-display";

test("formatFoodDisplayName remove in natura Brasil da TBCA", () => {
  assert.equal(
    formatFoodDisplayName("Banana, prata, in natura , Brasil"),
    "Banana prata",
  );
  assert.equal(formatFoodDisplayName("Abiu, in natura, Brasil"), "Abiu");
  assert.equal(
    formatFoodDisplayName("Abacaxi, polpa, in natura, Brasil"),
    "Abacaxi polpa",
  );
  assert.equal(
    formatFoodDisplayName("Atemóia, in natura, Brasil (média diferentes variedades)"),
    "Atemóia",
  );
  assert.equal(formatFoodDisplayName("Banana Figo in natura Brasil"), "Banana Figo");
});
