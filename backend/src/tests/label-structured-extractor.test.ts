import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExtractedLabelFactsBlock,
  parseLabelExtractionJson,
} from "../services/bella/label-structured-extractor";

test("parseLabelExtractionJson: separa porção e 100 g", () => {
  const extraction = parseLabelExtractionJson(
    JSON.stringify({
      readable: true,
      servingLabel: "60 g (1 unidade)",
      servingSizeG: 60,
      perServing: {
        caloriesKcal: 100,
        carbsG: 10,
        proteinG: 6,
        fatG: 0.9,
        sodiumMg: 233,
        addedSugarsG: 0,
      },
      per100g: {
        caloriesKcal: 167,
        carbsG: 17,
        proteinG: 10,
        fatG: 1.5,
        sodiumMg: 389,
        addedSugarsG: 0,
      },
      likelyProteinSource: true,
    }),
  );

  assert.equal(extraction.readable, true);
  assert.equal(extraction.perServing?.proteinG, 6);
  assert.equal(extraction.perServing?.carbsG, 10);
  assert.equal(extraction.per100g?.proteinG, 10);
});

test("buildExtractedLabelFactsBlock: cita porção e proíbe 100 g na classificação", () => {
  const block = buildExtractedLabelFactsBlock(
    parseLabelExtractionJson(
      JSON.stringify({
        readable: true,
        servingLabel: "60 g (1 unidade)",
        perServing: { proteinG: 6, carbsG: 10, fatG: 0.9, sodiumMg: 233 },
        per100g: { proteinG: 10, carbsG: 17, fatG: 1.5 },
        likelyProteinSource: true,
      }),
    ),
  );

  assert.match(block, /Porção de referência: \*\*60 g \(1 unidade\)\*\*/);
  assert.match(block, /Proteínas: 6 g/);
  assert.match(block, /Carboidratos: 10 g/);
  assert.match(block, /NÃO usar na classificação/);
  assert.match(block, /10 g é da coluna 100 g/);
});

test("parseLabelExtractionJson: ilegível sem porção", () => {
  const extraction = parseLabelExtractionJson(
    JSON.stringify({ readable: false, illegibleReason: "foto escura" }),
  );
  assert.equal(extraction.readable, false);
});

test("parseLabelExtractionJson: recupera margarina quando modelo marca ilegível mas trouxe porção", () => {
  const extraction = parseLabelExtractionJson(
    JSON.stringify({
      readable: false,
      illegibleReason: "lista de ingredientes não visível",
      servingLabel: "10 g (1 colher de sopa)",
      servingSizeG: 10,
      perServing: {
        caloriesKcal: 72,
        carbsG: 0,
        proteinG: 0,
        fatG: 8.3,
        sodiumMg: 60,
      },
      per100g: {
        caloriesKcal: 720,
        carbsG: 0,
        proteinG: 0,
        fatG: 83,
        sodiumMg: 600,
      },
      productHint: "margarina ou creme vegetal",
    }),
  );

  assert.equal(extraction.readable, true);
  assert.equal(extraction.perServing?.caloriesKcal, 72);
  assert.equal(extraction.perServing?.fatG, 8.3);
});

test("parseLabelExtractionJson: deriva porção a partir de 100 g quando necessário", () => {
  const extraction = parseLabelExtractionJson(
    JSON.stringify({
      readable: true,
      servingLabel: "10 g (1 colher de sopa)",
      servingSizeG: 10,
      perServing: {},
      per100g: {
        caloriesKcal: 720,
        carbsG: 0,
        proteinG: 0,
        fatG: 83,
        sodiumMg: 600,
      },
    }),
  );

  assert.equal(extraction.readable, true);
  assert.equal(extraction.perServing?.caloriesKcal, 72);
  assert.equal(extraction.perServing?.fatG, 8.3);
});
