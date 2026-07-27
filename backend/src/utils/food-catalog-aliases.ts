/** Nomes amigáveis (estilo Dietbox) para itens canônicos da TBCA/TACO. */
export const FOOD_CANONICAL_LABELS: Record<string, string> = {
  // Pães de forma (TBCA)
  BRC0145A: "Pão de forma",
  BRC0003A: "Pão de forma tradicional",
  BRC0155A: "Pão de forma integral",
  BRC0146A: "Pão de forma de milho",
  BRC0157A: "Pão de forma trigo/centeio",
  BRC0086N: "Pão de forma com fibras",
  BRC0150A: "Pão de forma fonte de fibra",
  BRC0151A: "Pão de forma aveia e soja",
  // Pão francês / integral (TBCA 7.3)
  BRC0002A: "Pão francês",
  BRC0149A: "Pão francês integral",
  BRC0173A: "Torrada de pão francês",
  // Pasta / laticínios
  BRC0290T: "Pasta de amendoim integral",
  BRC0041N: "Requeijão light zero gordura (Danúbio)",
  BRC0067G: "Requeijão cremoso",
  // TACO
  "TACO:50": "Pão de forma sem glúten",
  "TACO:49": "Pão de forma de milho",
  "TACO:48": "Pão de forma integral",
  "TACO:47": "Pão de forma aveia",
  "TACO:53": "Pão francês",
  "TACO:63": "Torrada de pão francês",
  "TACO:91": "Batata inglesa cozida",
  "TACO:92": "Batata inglesa",
  "TACO:471": "Café coado",
  "TACO:3": "Arroz branco cozido",
  "TACO:179": "Banana nanica",
  "TACO:182": "Banana prata",
  "TACO:222": "Maçã Fuji",
  BRC0275C: "Banana",
  BRC0023C: "Maçã",
  BRC0017C: "Laranja",
  BRC0399A: "Quinoa cozida",
  BRC0007H: "Café coado",
  BRC0010J: "Ovo cozido",
  BRC0727F: "Carne bovina de primeira grelhada",
  BRC0194F: "Peito de frango cozido",
  BRC0023B: "Couve manteiga",
  BRC0389B: "Molho de tomate caseiro",
  BRC0059G: "Queijo muçarela",
  BRC0906B: "Tapioca",
  BRC0029C: "Morango",
  BRC0035B: "Tomate",
  BRC0040N: "Requeijão light",
  "TACO:115": "Couve manteiga",
  "TACO:239": "Morango",
  "TACO:157": "Tomate",
};

/**
 * Termos extras indexados na busca (além do nome TBCA/TACO).
 * Preferir merge em tabela oficial; CUSTOM só quando não houver equivalente.
 */
export const FOOD_SEARCH_ALIASES: Record<string, string[]> = {
  BRC0145A: ["pao de forma", "pao forma", "pao de forma sem gluten"],
  BRC0003A: ["pao de forma tradicional", "pao forma tradicional"],
  BRC0155A: ["pao de forma integral", "pao integral forma"],
  BRC0146A: ["pao de forma milho", "pao forma milho"],
  BRC0157A: ["pao de forma centeio"],
  BRC0002A: [
    "pao frances",
    "pao de sal",
    "pao carequinha",
    "carequinha",
    "cacetinho",
    "pao frances tradicional",
    "pao frances padaria",
  ],
  BRC0149A: [
    "pao frances integral",
    "pao integral frances",
    "pao de trigo integral",
    "pao trigo integral",
  ],
  BRC0173A: ["torrada", "torrada light", "torrada pao frances"],
  BRC0290T: [
    "pasta de amendoim",
    "pasta amendoim",
    "pasta de amendoim integral",
    "manteiga de amendoim",
    "peanut butter",
    "mandubim",
  ],
  BRC0041N: [
    "requeijao light",
    "requeijao light danubio",
    "requeijao danubio",
    "requeijao zero",
    "requeijao zero gordura",
    "danubio light",
  ],
  BRC0067G: ["requeijao", "requeijao cremoso"],
  "TACO:50": ["pao de forma sem gluten", "pao forma sem gluten"],
  "TACO:48": ["pao de forma integral", "pao integral forma"],
  "TACO:53": [
    "pao frances",
    "pao de sal",
    "pao carequinha",
    "carequinha",
    "cacetinho",
  ],
  "TACO:63": ["torrada", "torrada pao frances"],
  "TACO:91": [
    "batata inglesa",
    "batata inglesa cozida",
    "batata inglesa assada",
    "batata assada",
    "batata cozida",
  ],
  "TACO:92": ["batata inglesa crua", "batata inglesa"],
  "TACO:471": ["cafe", "cafe coado", "cafe suave", "cafe intenso", "cafe coado suave"],
  "TACO:3": ["arroz", "arroz cozido", "arroz branco", "arroz branco cozido", "arroz tipo 1"],
  "TACO:179": ["banana", "banana nanica", "banana caturra", "banana grande"],
  "TACO:182": ["banana prata", "banana"],
  "TACO:222": ["maca", "maca fuji", "maca com casca", "apple"],
  BRC0275C: ["banana", "banana in natura", "banana crua"],
  BRC0023C: ["maca", "maca com casca", "maca in natura", "apple"],
  BRC0017C: ["laranja", "laranja in natura", "laranja crua"],
  BRC0399A: ["quinoa", "quinoa cozida", "quinoa cozido"],
  BRC0007H: ["cafe", "cafe coado", "cafe infusao", "cafe sem acucar"],
  BRC0010J: ["ovo", "ovo de galinha", "ovo cozido", "ovo mexido", "ovo frito"],
  BRC0727F: [
    "carne alcatra",
    "carne bovina alcatra",
    "alcatra contrafile",
    "alcatra patinho",
    "carne de primeira",
    "bife medio",
    "carne alcatra contrafile coxao mole file mignon lagarto patinho",
    "carne alcatra contrafile coxao mole",
  ],
  BRC0194F: [
    "frango desfiado",
    "peito de frango desfiado",
    "frango cozido desfiado",
    "carne frango peito cozida",
  ],
  BRC0023B: ["couve", "couve manteiga", "couve de folhas", "couve folha"],
  "TACO:115": ["couve", "couve manteiga", "couve de folhas"],
  BRC0389B: [
    "molho de tomate",
    "molho de tomate caseiro",
    "molho tomate caseiro",
    "molho ao sugo",
    "molho sugo",
  ],
  BRC0059G: [
    "queijo mucarela",
    "queijo mussarela",
    "mucarela",
    "mussarela",
    "mozarela",
    "queijo mozzarella",
  ],
  BRC0906B: [
    "tapioca",
    "tapioca massa pronta",
    "goma de tapioca",
    "tapioca sem recheio",
    "tapioca sem manteiga",
  ],
  BRC0029C: ["morango", "morango in natura", "morango cru"],
  "TACO:239": ["morango", "morango in natura", "morango cru"],
  BRC0035B: ["tomate", "tomate cru", "tomate in natura"],
  "TACO:157": ["tomate", "tomate cru", "tomate com semente"],
  BRC0040N: [
    "requeijao light",
    "requeijao cremoso light",
    "queijo requeijao light",
  ],
};

export function foodCatalogKey(source: string, sourceCode: string): string {
  return source === "TACO" ? `TACO:${sourceCode}` : sourceCode;
}

export function getFoodDisplayName(
  name: string,
  source: "TACO" | "TBCA" | "CUSTOM",
  sourceCode: string,
): string {
  if (source === "CUSTOM") return name;
  const key = foodCatalogKey(source, sourceCode);
  return FOOD_CANONICAL_LABELS[key] || name;
}

export function getFoodSearchAliasText(
  source: "TACO" | "TBCA" | "CUSTOM",
  sourceCode: string,
): string {
  const key = foodCatalogKey(source, sourceCode);
  const aliases = FOOD_SEARCH_ALIASES[key] || FOOD_SEARCH_ALIASES[sourceCode] || [];
  return aliases.join(" ");
}
