import { normalizeFoodSearchQuery, tokenizeFoodQuery } from "./food-search";
import { resolveSwapGroup, isAbsurdSwap, type SwapGroup } from "../services/bella/food-category";
import { atwaterEnergyGap, atwaterInputFromMacros, calculateAtwaterCalories } from "./atwater";
import { isAlteredFoodMismatch } from "../services/bella/swap-prep-state";

/** Match claramente impossível (ex.: quinoa → óleo / banana → caramelada). */
export function isAbsurdFoodMatch(
  query: string,
  candidateName: string,
  per100g?: {
    caloriesKcal?: number | null;
    proteinG?: number | null;
    carbsG?: number | null;
    fatG?: number | null;
  } | null,
): boolean {
  const q = normalizeFoodSearchQuery(query);
  const n = normalizeFoodSearchQuery(candidateName);
  if (!q || !n) return true;

  if (isAlteredFoodMismatch(query, candidateName)) return true;

  const qTokens = tokenizeFoodQuery(query);
  const fatG = Number(per100g?.fatG) || 0;
  const proteinG = Number(per100g?.proteinG) || 0;
  const carbsG = Number(per100g?.carbsG) || 0;
  const kcal = Number(per100g?.caloriesKcal) || 0;

  const queryMentionsOilWord = /\b(oleo|azeite|manteiga|margarina|gordura)\b/.test(q);
  const queryNegatesOil = /\b(sem oleo|s\/ oleo|sem azeite|s\/ azeite)\b/.test(q);
  const queryIsOil = queryMentionsOilWord && !queryNegatesOil;
  const candidateIsPureOil =
    fatG >= 80 ||
    /^oleo\b/.test(n) ||
    /^azeite\b/.test(n) ||
    /\boleo,?\s+linhaca\b/.test(n);

  if (candidateIsPureOil && !queryIsOil) return true;

  const queryIsCoffeeDrink =
    /\bcafe\b/.test(q) && !/\b(grao|torrado|moido|soluvel em po|chocolate|cacau)\b/.test(q);
  const candidateIsCoffeeGrounds =
    /\bcafe\b/.test(n) && /\b(torrado|moido|descafeinado)\b/.test(n) && !/\binfusao|bebida\b/.test(n);
  if (queryIsCoffeeDrink && candidateIsCoffeeGrounds) return true;
  if (
    queryIsCoffeeDrink &&
    /\b(chocolate|cacau|talento|biscuit|biscoito|bolo|doce)\b/.test(n) &&
    !/\binfusao|bebida\b/.test(n)
  ) {
    return true;
  }

  const queryIsEgg = /\bovo\b/.test(q) && !/\bpeixe|atum|sardinha\b/.test(q);
  const candidateIsFish = /\b(peixe|merluza|atum|sardinha|salmao|tilapia)\b/.test(n);
  if (queryIsEgg && candidateIsFish) return true;

  // Carne bovina (alcatra/patinho…) ≠ linguiça / embutido
  const queryIsBeefCut =
    /\b(alcatra|patinho|contrafile|coxao|file mignon|lagarto|picanha|acem)\b/.test(q) ||
    (/\bcarne\b/.test(q) &&
      /\b(bovina|boi|alcatra|patinho|contrafile|coxao|lagarto)\b/.test(q));
  if (queryIsBeefCut && /\b(linguica|salsicha|embutido|apresuntado|salame)\b/.test(n)) {
    return true;
  }

  // Frango (desfiado/peito) ≠ salpicão / atum / peixe
  if (/\bfrango\b/.test(q)) {
    if (/\bsalpicao\b/.test(n)) return true;
    if (
      /\b(atum|sardinha|sardinas|peixe|merluza|salmao|tilapia)\b/.test(n) &&
      !/\bfrango\b/.test(n)
    ) {
      return true;
    }
  }

  // Couve (manteiga/folhas) ≠ couve-rábano / couve-flor / salada com azeite
  if (/\bcouve\b/.test(q) && !/\bcouve[\s-]?flor|couve[\s-]?rabano\b/.test(q)) {
    if (/\bcouve[\s-]?rabano|nabo alemao\b/.test(n)) return true;
    if (/\bcouve[\s-]?flor\b/.test(n)) return true;
  }
  if (/\bcouve\b/.test(q) && !/\bsalada\b/.test(q)) {
    if (/^salada\b/.test(n) && /\b(azeite|oleo)\b/.test(n)) return true;
  }

  // Salada de folhas ≠ espinafre sozinho (usa CUSTOM LEAFY / alface)
  if (/\bsalada de folhas|mix de folhas\b/.test(q)) {
    if (/\bespinafre\b/.test(n) && !/\bsalada\b/.test(n)) return true;
  }

  // Molho de tomate ≠ sardinha / peixe / carne
  if (/\bmolho\b/.test(q) && /\btomate\b/.test(q)) {
    if (
      /\b(sardinha|sardinas|peixe|atum|carne|boi|frango)\b/.test(n) &&
      !/^molho\b/.test(n)
    ) {
      return true;
    }
  }

  // Queijo muçarela ≠ rolinho / sanduíche / pizza
  if (/\b(mucarela|mussarela|mozarela)\b/.test(q)) {
    if (/\b(rolinho|sanduiche|pizza|presunto|misto)\b/.test(n)) return true;
    // Sem "light" no pedido → não aceitar variante light
    if (!/\blight\b/.test(q) && /\blight\b/.test(n)) return true;
  }

  // Requeijão ≠ salsicha / linguiça
  if (/\brequeijao\b/.test(q) && /\b(salsicha|linguica|embutido)\b/.test(n)) {
    return true;
  }

  // Mussarela light ≠ tilsit / queijos sem muçarela
  if (/\b(mucarela|mussarela|mozarela)\b/.test(q) && /\blight\b/.test(q)) {
    if (/\btilsit\b/.test(n)) return true;
  }

  // Morango in natura ≠ creme / biscoito / bebida
  if (/\bmorango\b/.test(q) && !/\b(creme|biscoito|bolo|iogurte|geleia|bebida)\b/.test(q)) {
    if (
      /\b(creme de|biscoito|bolo|iogurte|geleia|bebida lactea|wafer|bombom)\b/.test(n) &&
      !/^morango\b/.test(n)
    ) {
      return true;
    }
  }

  // Tapioca (massa) ≠ tapioca recheada
  if (
    /\btapioca\b/.test(q) &&
    !/\b(queijo|manteiga|recheio|frango|banana|coco|charque)\b/.test(q)
  ) {
    if (/\bc\//.test(n) || /\bcom (queijo|manteiga|banana|frango|coco|charque)\b/.test(n)) {
      return true;
    }
  }

  // Tomate cru ≠ extrato / concentrado
  if (
    /\btomate\b/.test(q) &&
    !/\b(extrato|molho|concentrado|passata|cereja)\b/.test(q)
  ) {
    if (/\b(extrato|concentrado|passata)\b/.test(n)) return true;
  }

  const queryIsRice =
    /\barroz\b/.test(q) && !/\bmacarrao|bifum|pao|selvagem|wild\b/.test(q);
  const candidateIsRiceNoodle = /\bmacarrao de arroz|bifum\b/.test(n);
  if (queryIsRice && candidateIsRiceNoodle) return true;
  const candidateIsWildRice = /\bselvagem|wild rice\b/.test(n);
  if (queryIsRice && candidateIsWildRice) return true;
  if (queryIsRice && /\bpamonha|milho verde\b/.test(n) && !/\barroz\b/.test(n)) return true;

  const queryIsPotato = /\bbatata\b/.test(q) && !/\bdoce|baroa|chips\b/.test(q);
  const candidateIsSweetPotato = /\bsweet potato|batata doce\b/.test(n);
  if (queryIsPotato && candidateIsSweetPotato) return true;

  const queryIsTea = /\bcha\b/.test(q) || qTokens.includes("cha");
  const candidateIsDrySpice =
    /\b(em po|po de|gengibre, em po|canela, em po|oregano)\b/.test(n) &&
    !/\binfusao|bebida|cha\b/.test(n);
  if (queryIsTea && candidateIsDrySpice) return true;

  const queryGroup = resolveSwapGroup({ category: null, name: query, per100g: undefined });
  if (
    (queryGroup === "fruit" || queryGroup === "vegetable") &&
    kcal >= 160 &&
    /\b(doce|caramel|barra|chips|passa|desidrat|milanesa)\b/.test(n)
  ) {
    return true;
  }

  const candidateGroup = resolveSwapGroup({
    category: null,
    name: candidateName,
    per100g: per100g
      ? {
          caloriesKcal: kcal,
          proteinG,
          carbsG,
          fatG,
          energyPolicy: "atwater",
        }
      : undefined,
  });
  if (
    queryGroup !== "mixed" &&
    candidateGroup !== "mixed" &&
    isAbsurdSwap(queryGroup, candidateGroup)
  ) {
    return true;
  }
  if (queryGroup === "carb_rich" && candidateGroup === "fat_rich") return true;
  if (queryGroup === "protein_rich" && candidateGroup === "fat_rich" && fatG >= 50) return true;
  if (
    queryGroup === "protein_rich" &&
    candidateGroup === "carb_rich" &&
    carbsG >= 40 &&
    proteinG < 10
  ) {
    return true;
  }

  return false;
}

/** Valida macros por 100 g: plausíveis e coerentes com Atwater (ou corrige kJ→kcal). */
export function sanitizeResearchedPer100g(input: {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number | null;
}): { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number; fiberG: number | null } | null {
  let caloriesKcal = Number(input.caloriesKcal);
  let proteinG = Number(input.proteinG);
  let carbsG = Number(input.carbsG);
  let fatG = Number(input.fatG);
  const fiberG = input.fiberG == null ? null : Number(input.fiberG);

  if (![caloriesKcal, proteinG, carbsG, fatG].every((n) => Number.isFinite(n) && n >= 0)) {
    return null;
  }
  if (proteinG > 100 || carbsG > 100 || fatG > 100) return null;
  if (proteinG + carbsG + fatG > 105) return null;

  const atwaterInput = atwaterInputFromMacros({
    carbsG,
    proteinG,
    fatG,
    fiberG: fiberG ?? 0,
  });
  const atwater = calculateAtwaterCalories(atwaterInput);
  if (atwater <= 0 && caloriesKcal <= 0) return null;

  if (caloriesKcal > 0 && atwater > 0) {
    const ratio = caloriesKcal / atwater;
    if (ratio >= 3.5 && ratio <= 5) {
      caloriesKcal = Math.round(caloriesKcal / 4.184);
    }
  }

  const gap = atwaterEnergyGap(caloriesKcal, atwaterInput);
  if (atwater > 0) {
    if (gap > Math.max(40, atwater * 0.35) && caloriesKcal > 0) {
      caloriesKcal = atwater;
    } else if (caloriesKcal <= 0) {
      caloriesKcal = atwater;
    } else {
      caloriesKcal = atwater;
    }
  }

  if (caloriesKcal > 950 || caloriesKcal < 0) return null;

  return {
    caloriesKcal: Math.round(caloriesKcal),
    proteinG: Math.round(proteinG * 10) / 10,
    carbsG: Math.round(carbsG * 10) / 10,
    fatG: Math.round(fatG * 10) / 10,
    fiberG: fiberG == null || !Number.isFinite(fiberG) ? null : Math.round(fiberG * 10) / 10,
  };
}

export function expectedGroupFromFoodName(name: string): SwapGroup | undefined {
  const group = resolveSwapGroup({ category: null, name, per100g: undefined });
  return group !== "mixed" ? group : undefined;
}
