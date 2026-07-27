import { getFoodDisplayName, getFoodSearchAliasText } from "./food-catalog-aliases";
import {
  normalizeFoodSearchQuery,
  scoreFoodSearchResult,
  tokenizeFoodQuery,
} from "./food-search";
import { scoreIngredientNaturalness } from "../services/bella/swap-prep-state";

const COMPOUND_DISH =
  /sandu[ií]che|sandwich|benedit|misto quente|hamb[uú]rguer|hot dog|pizza|lasanha|bolo\b|torta\b|estrogonofe|feijoada|prato de|salada de|salpic[aã]o|rolinho de|creme de inhame|creme de frutas/i;

const BREAD_VARIANT_MARKERS = [
  "milho",
  "integral",
  "centeio",
  "aveia",
  "soja",
  "light",
  "diet",
  "fibras",
  "preto",
  "multigraos",
  "multigrãos",
];

function isSimpleBreadFormQuery(queryTokens: string[]): boolean {
  return queryTokens.length >= 2 && queryTokens.includes("pao") && queryTokens.includes("forma");
}

export function scoreFoodForMealPlanSearch(
  query: string,
  name: string,
  source: "TACO" | "TBCA" | "CUSTOM",
  sourceCode = "",
): number {
  let score = scoreFoodSearchResult(query, name, source);
  const normalizedQuery = normalizeFoodSearchQuery(query);
  const queryTokens = tokenizeFoodQuery(query);
  const normalizedName = normalizeFoodSearchQuery(name);
  const primary = normalizeFoodSearchQuery(name.split(",")[0] || name);
  const aliasText = getFoodSearchAliasText(source, sourceCode);
  const displayName = getFoodDisplayName(name, source, sourceCode);
  const normalizedDisplay = normalizeFoodSearchQuery(displayName);

  if (normalizedDisplay === normalizedQuery) score += 220;
  else if (normalizedQuery.startsWith(normalizedDisplay) && normalizedDisplay.length >= 8) {
    score += 120;
  }

  if (aliasText && normalizedQuery) {
    if (aliasText.includes(normalizedQuery)) score += 280;
    const aliasTokens = tokenizeFoodQuery(aliasText);
    const aliasHits = queryTokens.filter((token) => aliasTokens.includes(token)).length;
    if (aliasHits === queryTokens.length && queryTokens.length > 0) score += 110;
  }

  if (isSimpleBreadFormQuery(queryTokens)) {
    for (const marker of BREAD_VARIANT_MARKERS) {
      if (normalizedName.includes(marker) && !normalizedQuery.includes(marker)) {
        score -= 70;
      }
    }
  }

  if (COMPOUND_DISH.test(name)) score -= 220;
  if (/^salada\b/i.test(name) && !/\bsalada\b/.test(normalizedQuery)) score -= 240;
  // Penaliza óleo extra só quando o candidato NÃO é o próprio molho/azeite pedido
  if (
    /\bc\/\s*(azeite|oleo)|com (azeite|oleo)\b/i.test(normalizedName) &&
    !/\b(azeite|oleo|molho)\b/.test(normalizedQuery) &&
    !/^molho\b/.test(normalizedName)
  ) {
    score -= 200;
  }
  if (/\([^)]{18,}\)/.test(name)) score -= 70;

  const commaCount = (name.match(/,/g) || []).length;
  if (commaCount >= 4) score -= 55;
  else if (commaCount >= 3) score -= 30;
  else if (commaCount <= 1) score += 18;

  if (queryTokens.includes("pao") && queryTokens.includes("forma")) {
    if (/^pao\b/.test(normalizedName) && /\bforma\b/.test(normalizedName) && !COMPOUND_DISH.test(name)) {
      score += 95;
    }
    if (source === "TBCA" && /\bforma\b/.test(normalizedName) && !/sanduiche|sandwich/i.test(normalizedName)) {
      score += 35;
    }
  }

  // "Pão francês" / carequinha → prioriza BRC0002A / TACO:53, não sanduíche.
  const isFrenchBreadQuery =
    queryTokens.includes("pao") &&
    (queryTokens.includes("frances") ||
      queryTokens.includes("carequinha") ||
      queryTokens.includes("cacetinho") ||
      (queryTokens.includes("de") && queryTokens.includes("sal")));
  if (isFrenchBreadQuery) {
    if (COMPOUND_DISH.test(name) || /sanduiche|sandwich/i.test(name)) score -= 220;
    if (/\bc\/\b|, c\//i.test(name) && sourceCode !== "BRC0002A") score -= 200;
    if (sourceCode === "BRC0002A" || sourceCode === "53") score += 220;
    if (
      /^pao frances\b/.test(normalizedName) &&
      !COMPOUND_DISH.test(name) &&
      !/\bc\/\b/.test(normalizedName)
    ) {
      score += 120;
    }
    if (queryTokens.includes("integral") && (sourceCode === "BRC0149A" || /\bintegral\b/.test(normalizedName))) {
      score += 160;
    }
    if (!queryTokens.includes("integral") && /\bintegral\b/.test(normalizedName) && sourceCode !== "BRC0149A") {
      score -= 50;
    }
  }

  // Requeijão light Danúbio → BRC0041N
  if (queryTokens.includes("requeijao") && (queryTokens.includes("light") || queryTokens.includes("danubio"))) {
    if (sourceCode === "BRC0041N") score += 200;
    if (/sanduiche|pizza|molho|papa de/i.test(name)) score -= 180;
  }

  // CUSTOM curado: nome curto do plano dentro do display
  if (source === "CUSTOM") {
    if (normalizedName.startsWith(normalizedQuery) && normalizedQuery.length >= 8) score += 90;
    if (normalizedDisplay.startsWith(normalizedQuery) && normalizedQuery.length >= 8) score += 110;
  }

  if (primary === normalizedQuery) score += 80;
  else if (queryTokens.length >= 2 && queryTokens.every((token) => primary.includes(token))) {
    score += 55;
  }

  if (normalizedName.includes(normalizedQuery) && !COMPOUND_DISH.test(name)) {
    score += 25;
  }

  // Regra geral: alimento simples → natural; não doce/caramelado/empanado.
  score += scoreIngredientNaturalness(query, name);

  // Óleo puro nunca ganha de carb/proteína do plano.
  if (
    (/^oleo\b|^azeite\b|\boleo,?\s+linhaca\b/.test(normalizedName) ||
      /\bgorduras e oleos\b/.test(normalizedName)) &&
    !/\b(oleo|azeite|manteiga|margarina)\b/.test(normalizedQuery)
  ) {
    score -= 500;
  }

  // Café torrado/moído ≠ café coado/infusão.
  if (
    /\bcafe\b/.test(normalizedQuery) &&
    !/\b(grao|torrado|moido)\b/.test(normalizedQuery) &&
    /\b(torrado|moido)\b/.test(normalizedName) &&
    !/\binfusao|bebida\b/.test(normalizedName)
  ) {
    score -= 400;
  }

  // Arroz ≠ macarrão de arroz / bifum.
  if (
    /\barroz\b/.test(normalizedQuery) &&
    !/\bmacarrao|bifum\b/.test(normalizedQuery) &&
    /\bmacarrao de arroz|bifum\b/.test(normalizedName)
  ) {
    score -= 350;
  }
  if (queryTokens.includes("arroz") && (sourceCode === "3" || /^arroz, tipo 1, cozido/.test(normalizedName))) {
    score += 280;
  }
  if (
    /\barroz\b/.test(normalizedQuery) &&
    !/\bselvagem|wild\b/.test(normalizedQuery) &&
    /\bselvagem|wild rice\b/.test(normalizedName)
  ) {
    score -= 400;
  }
  if (
    /\barroz\b/.test(normalizedQuery) &&
    !/\bpamonha|milho\b/.test(normalizedQuery) &&
    /\bpamonha|milho verde\b/.test(normalizedName)
  ) {
    score -= 450;
  }
  if (/^arroz\b/.test(normalizedName) && /\bcozido\b/.test(normalizedName) && queryTokens.includes("arroz")) {
    score += 90;
  }

  // Quinoa cozida
  if (queryTokens.includes("quinoa") && /\bquinoa\b/.test(normalizedName) && /\bcozid/.test(normalizedName)) {
    score += 180;
    if (sourceCode === "BRC0399A") score += 80;
  }

  // Batata inglesa (não doce / chips)
  if (queryTokens.includes("batata") && (queryTokens.includes("inglesa") || queryTokens.includes("assada") || queryTokens.includes("cozida"))) {
    if (/\bbatata doce|sweet potato|chips\b/.test(normalizedName)) score -= 400;
    if (/\bbatata inglesa\b/.test(normalizedName) && !/\bchips|suica|caldo|bolinho|pure\b/.test(normalizedName)) {
      score += 160;
    }
    if (sourceCode === "91" || sourceCode === "92" || sourceCode === "BRC0013B") score += 120;
  }

  // Café bebida
  if (queryTokens.includes("cafe") && (sourceCode === "471" || /\binfusao\b/.test(normalizedName))) {
    score += 200;
  }

  // Ovo
  if (queryTokens.includes("ovo") && (sourceCode === "BRC0010J" || sourceCode === "BRC0023J" || /^ovo, galinha/.test(normalizedName))) {
    score += 180;
  }

  // Maçã / laranja canônicas
  if (queryTokens.includes("maca") && !/\bmacauba|macadamia\b/.test(normalizedName)) {
    if (sourceCode === "BRC0023C" || sourceCode === "222" || sourceCode === "221") score += 200;
    if (/^maca\b/.test(normalizedName) && /\b(in natura|crua)\b/.test(normalizedName)) score += 120;
  }
  if (queryTokens.includes("laranja") && (sourceCode === "BRC0017C" || /^laranja\b/.test(normalizedName) && /\bin natura\b/.test(normalizedName) && !/\bcasca\b/.test(normalizedName))) {
    score += 180;
  }

  // Carne de primeira (alcatra/patinho…)
  if (
    /\b(alcatra|patinho|contrafile|coxao|lagarto|file mignon)\b/.test(normalizedQuery) ||
    (queryTokens.includes("carne") && /\b(alcatra|patinho|primeira)\b/.test(normalizedQuery))
  ) {
    if (sourceCode === "BRC0727F" || sourceCode === "BRC0730F") score += 280;
    if (/\bcarne, boi, de primeira\b/.test(normalizedName) && !/\bmilanesa\b/.test(normalizedName)) {
      score += 160;
    }
    if (/\b(linguica|salsicha)\b/.test(normalizedName)) score -= 500;
  }

  // Frango desfiado → peito cozido
  if (/\bfrango\b/.test(normalizedQuery) && /\bdesfiado\b/.test(normalizedQuery)) {
    if (sourceCode === "BRC0194F" || sourceCode === "BRC0195F") score += 280;
    if (/\bfrango, peito\b/.test(normalizedName) && /\bcozida\b/.test(normalizedName) && !/\bmolho\b/.test(normalizedName)) {
      score += 160;
    }
    if (/\bsalpicao\b/.test(normalizedName)) score -= 500;
  }

  // Couve manteiga
  if (queryTokens.includes("couve") && !/\bcouve[\s-]?flor|couve[\s-]?rabano\b/.test(normalizedQuery)) {
    if (sourceCode === "BRC0023B" || sourceCode === "115") score += 260;
    if (/\bcouve, manteiga\b/.test(normalizedName)) score += 140;
    if (/\bcouve[\s-]?rabano|nabo alemao\b/.test(normalizedName)) score -= 500;
  }

  // Salada de folhas → CUSTOM LEAFY
  if (/\bsalada de folhas|mix de folhas\b/.test(normalizedQuery)) {
    if (sourceCode === "LEAFY_SALAD_MIX" || /salada de folhas/.test(normalizedName)) score += 320;
    if (/\bespinafre\b/.test(normalizedName)) score -= 400;
  }

  // Molho de tomate caseiro
  if (/\bmolho\b/.test(normalizedQuery) && /\btomate\b/.test(normalizedQuery)) {
    if (sourceCode === "BRC0389B" || sourceCode === "BRC1192B" || sourceCode === "BRC1238B") {
      score += 280;
    }
    if (/^molho tomate\b|^molho de tomate\b/.test(normalizedName)) score += 160;
    if (/\b(sardinha|sardinas|peixe)\b/.test(normalizedName)) score -= 500;
  }

  // Muçarela / mussarela light Verde Campo
  if (/\b(mucarela|mussarela|mozarela)\b/.test(normalizedQuery)) {
    if (/\blight\b/.test(normalizedQuery)) {
      if (sourceCode === "MUSSARELA_LIGHT_VERDE_CAMPO" || sourceCode === "BRC0074N") score += 300;
      if (/\btilsit\b/.test(normalizedName)) score -= 500;
    } else {
      if (sourceCode === "BRC0059G" || sourceCode === "BRC0047G") score += 240;
      // Sem "light" no plano → não usar variante light / Verde Campo
      if (/\blight\b/.test(normalizedName) || sourceCode === "MUSSARELA_LIGHT_VERDE_CAMPO") {
        score -= 280;
      }
    }
    if (/\b(rolinho|sanduiche|pizza)\b/.test(normalizedName)) score -= 450;
  }

  // Requeijão cremoso light
  if (/\brequeijao\b/.test(normalizedQuery)) {
    if (/\blight\b/.test(normalizedQuery)) {
      if (
        sourceCode === "REQUEIJAO_LIGHT_GENERIC" ||
        sourceCode === "REQUEIJAO_LIGHT_VERDE_CAMPO" ||
        sourceCode === "BRC0040N" ||
        sourceCode === "BRC0041N"
      ) {
        score += 280;
      }
    }
    if (/\b(salsicha|linguica)\b/.test(normalizedName)) score -= 500;
  }

  // Morango in natura
  if (queryTokens.includes("morango") && !/\b(creme|biscoito|bolo)\b/.test(normalizedQuery)) {
    if (sourceCode === "BRC0029C" || sourceCode === "239") score += 280;
    if (/^morango\b/.test(normalizedName) && /\b(in natura|cru)\b/.test(normalizedName)) score += 160;
    if (/\bcreme de\b/.test(normalizedName)) score -= 450;
  }

  // Tapioca massa pronta
  if (queryTokens.includes("tapioca")) {
    if (sourceCode === "BRC0906B") score += 300;
    if (/\btapioca, sem manteiga, sem recheio\b/.test(normalizedName)) score += 200;
    if (/\bc\/\b/.test(normalizedName) && !/\b(queijo|manteiga|recheio)\b/.test(normalizedQuery)) {
      score -= 350;
    }
  }

  // Tomate fresco
  if (queryTokens.includes("tomate") && !/\b(molho|extrato|cereja)\b/.test(normalizedQuery)) {
    if (sourceCode === "BRC0035B" || sourceCode === "157") score += 260;
    if (/^tomate\b/.test(normalizedName) && /\b(cru|in natura)\b/.test(normalizedName)) score += 140;
    if (/\bextrato\b/.test(normalizedName)) score -= 400;
  }

  return score;
}
