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

function buildSeed(): FoodOverrideSeed[] {
  // Itens "tradicionais" do app: base curada com macros estáveis.
  // Valores por 100g (genéricos) para padronizar o diário alimentar.
  const wheyWpc = "Whey protein (suplemento)";
  const wheyWpi = "Whey protein isolado (suplemento)";
  const wheyHydro = "Whey protein hidrolisado (suplemento)";
  const creatine = "Creatina monohidratada (suplemento)";
  const oats = "Aveia em flocos";
  const porridge = "Mingau de aveia (preparado)";
  const milkSkim = "Leite desnatado";
  const milkWhole = "Leite integral";
  const banana = "Banana (genérica)";

  return [
    // Whey concentrado (WPC): 80P / 8C / 6G → ~406 kcal (Atwater)
    {
      code: "WHEY_WPC",
      name: wheyWpc,
      category: "Suplementos",
      caloriesKcal: 406,
      proteinG: 80,
      carbsG: 8,
      fatG: 6,
      fiberG: 0,
      sodiumMg: null,
      searchText: normalizeFoodSearchQuery(`${wheyWpc} whey protein suplemento soro concentrado`),
    },
    // Whey isolado (WPI): 90P / 3C / 2G → ~390 kcal
    {
      code: "WHEY_WPI",
      name: wheyWpi,
      category: "Suplementos",
      caloriesKcal: 390,
      proteinG: 90,
      carbsG: 3,
      fatG: 2,
      fiberG: 0,
      sodiumMg: null,
      searchText: normalizeFoodSearchQuery(`${wheyWpi} whey isolado protein suplemento`),
    },
    // Whey hidrolisado (genérico): 85P / 6C / 3G → ~391 kcal (arredondado)
    {
      code: "WHEY_HYDRO",
      name: wheyHydro,
      category: "Suplementos",
      caloriesKcal: 391,
      proteinG: 85,
      carbsG: 6,
      fatG: 3,
      fiberG: 0,
      sodiumMg: null,
      searchText: normalizeFoodSearchQuery(`${wheyHydro} whey hidrolisado protein suplemento`),
    },
    // Creatina: 0 kcal (uso comum é 3-5g/dia; aqui só garantimos opção na busca)
    {
      code: "CREATINE_MONO",
      name: creatine,
      category: "Suplementos",
      caloriesKcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sodiumMg: null,
      searchText: normalizeFoodSearchQuery(`${creatine} creatina suplemento`),
    },
    // Aveia em flocos (genérico)
    {
      code: "OATS_FLAKES",
      name: oats,
      category: "Cereais",
      caloriesKcal: 389,
      proteinG: 16.9,
      carbsG: 66.3,
      fatG: 6.9,
      fiberG: 10.6,
      sodiumMg: 2,
      searchText: normalizeFoodSearchQuery(`${oats} aveia flocos cereal`),
    },
    // Mingau (preparado): depende da receita; usamos um baseline conservador para não inflar kcal.
    {
      code: "PORRIDGE_OATS_PREP",
      name: porridge,
      category: "Preparações",
      caloriesKcal: 70,
      proteinG: 2.5,
      carbsG: 12.5,
      fatG: 1.2,
      fiberG: 1.7,
      sodiumMg: null,
      searchText: normalizeFoodSearchQuery(`${porridge} mingau aveia preparado`),
    },
    // Leite desnatado (genérico)
    {
      code: "MILK_SKIM",
      name: milkSkim,
      category: "Laticínios",
      caloriesKcal: 34,
      proteinG: 3.4,
      carbsG: 5.0,
      fatG: 0.1,
      fiberG: 0,
      sodiumMg: 44,
      searchText: normalizeFoodSearchQuery(`${milkSkim} leite`),
    },
    // Leite integral (genérico)
    {
      code: "MILK_WHOLE",
      name: milkWhole,
      category: "Laticínios",
      caloriesKcal: 61,
      proteinG: 3.2,
      carbsG: 4.7,
      fatG: 3.3,
      fiberG: 0,
      sodiumMg: 43,
      searchText: normalizeFoodSearchQuery(`${milkWhole} leite`),
    },
    // Banana (genérico)
    {
      code: "BANANA_GENERIC",
      name: banana,
      category: "Frutas",
      caloriesKcal: 89,
      proteinG: 1.1,
      carbsG: 22.8,
      fatG: 0.3,
      fiberG: 2.6,
      sodiumMg: 1,
      searchText: normalizeFoodSearchQuery(`${banana} banana prata nanica fruta`),
    },
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

