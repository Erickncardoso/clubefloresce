import { prisma } from "../lib/prisma";
import { normalizeFoodSearchQuery } from "../utils/food-search";

type FoodOverrideSeed = {
  code: string;
  name: string;
  category?: string | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number | null;
  sodiumMg?: number | null;
  searchText: string;
};

function item(seed: Omit<FoodOverrideSeed, "searchText"> & { aliases?: string[] }): FoodOverrideSeed {
  const aliases = seed.aliases?.length ? ` ${seed.aliases.join(" ")}` : "";
  return {
    code: seed.code,
    name: seed.name,
    category: seed.category ?? null,
    caloriesKcal: seed.caloriesKcal,
    proteinG: seed.proteinG,
    carbsG: seed.carbsG,
    fatG: seed.fatG,
    fiberG: seed.fiberG ?? null,
    sodiumMg: seed.sodiumMg ?? null,
    searchText: normalizeFoodSearchQuery(`${seed.name}${aliases}`),
  };
}

/**
 * Macros por 100g.
 * Para produtos de marca (YoPRO, Growth, etc.), valores baseados nas tabelas oficiais
 * convertidos de porção → 100g quando necessário.
 */
function buildSeed(): FoodOverrideSeed[] {
  return [
    // ── Genéricos (fallback) ──────────────────────────────────────────────
    item({
      code: "WHEY_WPC",
      name: "Whey protein concentrado (genérico)",
      category: "Suplementos",
      caloriesKcal: 406,
      proteinG: 80,
      carbsG: 8,
      fatG: 6,
      fiberG: 0,
      aliases: ["whey", "whey protein", "suplemento", "soro", "wpc"],
    }),
    item({
      code: "WHEY_WPI",
      name: "Whey protein isolado (genérico)",
      category: "Suplementos",
      caloriesKcal: 390,
      proteinG: 90,
      carbsG: 3,
      fatG: 2,
      fiberG: 0,
      aliases: ["whey isolado", "wpi", "suplemento"],
    }),
    item({
      code: "WHEY_HYDRO",
      name: "Whey protein hidrolisado (genérico)",
      category: "Suplementos",
      caloriesKcal: 391,
      proteinG: 85,
      carbsG: 6,
      fatG: 3,
      fiberG: 0,
      aliases: ["whey hidrolisado", "suplemento"],
    }),
    item({
      code: "CREATINE_MONO",
      name: "Creatina monohidratada (genérico)",
      category: "Suplementos",
      caloriesKcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      aliases: ["creatina", "creatine", "suplemento"],
    }),
    item({
      code: "OATS_FLAKES",
      name: "Aveia em flocos",
      category: "Cereais",
      caloriesKcal: 389,
      proteinG: 16.9,
      carbsG: 66.3,
      fatG: 6.9,
      fiberG: 10.6,
      sodiumMg: 2,
      aliases: ["aveia", "flocos", "cereal"],
    }),
    item({
      code: "PORRIDGE_OATS_PREP",
      name: "Mingau de aveia (preparado)",
      category: "Preparações",
      caloriesKcal: 70,
      proteinG: 2.5,
      carbsG: 12.5,
      fatG: 1.2,
      fiberG: 1.7,
      aliases: ["mingau", "aveia", "preparado"],
    }),
    item({
      code: "MILK_SKIM",
      name: "Leite desnatado",
      category: "Laticínios",
      caloriesKcal: 34,
      proteinG: 3.4,
      carbsG: 5.0,
      fatG: 0.1,
      fiberG: 0,
      sodiumMg: 44,
      aliases: ["leite desnatado"],
    }),
    item({
      code: "MILK_WHOLE",
      name: "Leite integral",
      category: "Laticínios",
      caloriesKcal: 61,
      proteinG: 3.2,
      carbsG: 4.7,
      fatG: 3.3,
      fiberG: 0,
      sodiumMg: 43,
      aliases: ["leite integral"],
    }),
    item({
      code: "BANANA_GENERIC",
      name: "Banana (genérica)",
      category: "Frutas",
      caloriesKcal: 89,
      proteinG: 1.1,
      carbsG: 22.8,
      fatG: 0.3,
      fiberG: 2.6,
      sodiumMg: 1,
      aliases: ["banana", "prata", "nanica"],
    }),

    // ── Danone YoPRO (tabela oficial por 100g) ─────────────────────────────
    // Colherável 160g / 15g proteína → 53 kcal · 9,5P · 3,5C · 0G / 100g
    item({
      code: "YOPRO_SPOONABLE_15G",
      name: "YoPRO iogurte colherável 15g proteína",
      category: "Laticínios",
      caloriesKcal: 53,
      proteinG: 9.5,
      carbsG: 3.5,
      fatG: 0,
      fiberG: 0,
      sodiumMg: 28,
      aliases: [
        "yopro",
        "yo pro",
        "danone yopro",
        "iogurte yopro",
        "yopro colheravel",
        "yopro morango",
        "yopro coco",
        "yopro natural",
      ],
    }),
    // Líquido 250g / 15g proteína → 47 kcal · 6,1P · 5,6C · 0G / 100g
    item({
      code: "YOPRO_DRINK_15G",
      name: "YoPRO iogurte líquido 15g proteína",
      category: "Laticínios",
      caloriesKcal: 47,
      proteinG: 6.1,
      carbsG: 5.6,
      fatG: 0,
      fiberG: 0,
      sodiumMg: 53,
      aliases: [
        "yopro",
        "yo pro",
        "danone yopro",
        "yopro liquido",
        "yopro 15g",
        "yopro doce de leite",
        "bebida yopro",
      ],
    }),
    // Líquido 250g / 25g proteína → 61 kcal · 9,7P · 4,3C · 0,6G / 100g
    item({
      code: "YOPRO_DRINK_25G",
      name: "YoPRO iogurte líquido 25g proteína",
      category: "Laticínios",
      caloriesKcal: 61,
      proteinG: 9.7,
      carbsG: 4.3,
      fatG: 0.6,
      fiberG: 0,
      sodiumMg: 64,
      aliases: [
        "yopro",
        "yo pro",
        "danone yopro",
        "yopro 25g",
        "yopro liquido 25",
        "yopro caramelo",
        "yopro high protein",
      ],
    }),
    // Bebida láctea UHT 250ml / 15g proteína (chocolate) → 69 kcal · 6P · 8,4C · 1,1G / 100g
    item({
      code: "YOPRO_UHT_15G",
      name: "YoPRO bebida láctea UHT 15g proteína",
      category: "Laticínios",
      caloriesKcal: 69,
      proteinG: 6,
      carbsG: 8.4,
      fatG: 1.1,
      fiberG: 0.6,
      sodiumMg: 92,
      aliases: [
        "yopro",
        "yo pro",
        "danone yopro",
        "yopro uht",
        "yopro chocolate",
        "bebida lactea yopro",
      ],
    }),

    // ── Growth Supplements (rótulo oficial, convertido porção → 100g) ─────
    // WPC 80% natural: 30g = 126 kcal · 24P · 3,1C · 2G → /100g
    item({
      code: "GROWTH_WHEY_WPC",
      name: "Growth Whey Protein Concentrado 80%",
      category: "Suplementos",
      caloriesKcal: 420,
      proteinG: 80,
      carbsG: 10.3,
      fatG: 6.7,
      fiberG: 0,
      sodiumMg: 177,
      aliases: [
        "growth",
        "growth supplements",
        "growth whey",
        "whey growth",
        "whey concentrado growth",
        "wpc growth",
      ],
    }),
    // WPI Growth (padrão comum ~90%): 100g aproximado
    item({
      code: "GROWTH_WHEY_WPI",
      name: "Growth Whey Protein Isolado",
      category: "Suplementos",
      caloriesKcal: 380,
      proteinG: 90,
      carbsG: 2,
      fatG: 1.5,
      fiberG: 0,
      aliases: ["growth isolado", "growth wpi", "whey isolado growth"],
    }),
    item({
      code: "GROWTH_CREATINE",
      name: "Growth Creatina Monohidratada",
      category: "Suplementos",
      caloriesKcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      aliases: ["growth creatina", "creatina growth"],
    }),

    // ── Max Titanium (referência comum de marca) ──────────────────────────
    item({
      code: "MAX_WHEY_WPC",
      name: "Max Titanium Whey Protein Concentrado",
      category: "Suplementos",
      caloriesKcal: 400,
      proteinG: 75,
      carbsG: 10,
      fatG: 5,
      fiberG: 0,
      aliases: ["max titanium", "max whey", "whey max", "whey concentrado max"],
    }),
    item({
      code: "MAX_WHEY_WPI",
      name: "Max Titanium Isolado de Whey Protein",
      category: "Suplementos",
      caloriesKcal: 370,
      proteinG: 88,
      carbsG: 2,
      fatG: 1,
      fiberG: 0,
      aliases: ["max isolado", "max wpi", "whey isolado max"],
    }),

    // ── Integralmédica ────────────────────────────────────────────────────
    item({
      code: "INTEGRAL_WHEY_WPC",
      name: "Integralmédica Whey Protein Concentrado",
      category: "Suplementos",
      caloriesKcal: 410,
      proteinG: 78,
      carbsG: 9,
      fatG: 5.5,
      fiberG: 0,
      aliases: ["integralmedica", "integral medica", "whey integralmedica", "whey integral"],
    }),

    // ── Nestlé / Morango e Outros comuns ───────────────────────────────────
    item({
      code: "NESCAU_LTD",
      name: "Nescau Achocolatado (pó)",
      category: "Bebidas",
      caloriesKcal: 372,
      proteinG: 4.2,
      carbsG: 87,
      fatG: 2.2,
      fiberG: 3.5,
      aliases: ["nescau", "achocolatado", "chocolate em po"],
    }),
    item({
      code: "YOGURT_GREGO_NATURAL",
      name: "Iogurte grego natural (genérico)",
      category: "Laticínios",
      caloriesKcal: 97,
      proteinG: 9,
      carbsG: 3.6,
      fatG: 5,
      fiberG: 0,
      aliases: ["iogurte grego", "greek yogurt", "iogurte grego natural"],
    }),
    item({
      code: "YOGURT_NATURAL_DESNATADO",
      name: "Iogurte natural desnatado (genérico)",
      category: "Laticínios",
      caloriesKcal: 41,
      proteinG: 4.4,
      carbsG: 5.5,
      fatG: 0.3,
      fiberG: 0,
      aliases: ["iogurte natural", "iogurte desnatado"],
    }),
  ];
}

export async function ensureFoodOverridesSeeded(): Promise<void> {
  const seeds = buildSeed();

  for (const seed of seeds) {
    await prisma.foodOverride.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        category: seed.category ?? null,
        caloriesKcal: seed.caloriesKcal,
        proteinG: seed.proteinG,
        carbsG: seed.carbsG,
        fatG: seed.fatG,
        fiberG: seed.fiberG ?? null,
        sodiumMg: seed.sodiumMg ?? null,
        searchText: seed.searchText,
      },
      create: {
        code: seed.code,
        name: seed.name,
        category: seed.category ?? null,
        caloriesKcal: seed.caloriesKcal,
        proteinG: seed.proteinG,
        carbsG: seed.carbsG,
        fatG: seed.fatG,
        fiberG: seed.fiberG ?? null,
        sodiumMg: seed.sodiumMg ?? null,
        searchText: seed.searchText,
      },
    });
  }
}
