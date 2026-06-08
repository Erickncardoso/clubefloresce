/**
 * Substituições extraídas do plano alimentar (PDF do nutricionista).
 * Quando a API existir, este arquivo será alimentado pelo parse do PDF por paciente.
 */
export const MEAL_PLAN_PDF_SOURCE = {
  fileName: 'plano-alimentar-florescer.pdf',
  label: 'Plano alimentar prescrito',
}

/** @type {Record<string, { options: Array<{ food: string, amount?: number, unit: string, qualifier?: string, note?: string }> }>} */
export const MEAL_SUBSTITUTIONS = {
  'pao-integral': {
    options: [
      { food: 'tapioca', amount: 2, unit: 'unidade', note: '2 unidades médias' },
      { food: 'pão 100% integral', amount: 1, unit: 'fatia' },
      { food: 'aveia em flocos', amount: 40, unit: 'g' },
    ],
  },
  cottage: {
    options: [
      { food: 'ricota', amount: 60, unit: 'g' },
      { food: 'iogurte natural', amount: 150, unit: 'g' },
      { food: 'queijo minas frescal', amount: 50, unit: 'g' },
    ],
  },
  mamao: {
    options: [
      { food: 'mamão formosa', amount: 0.5, unit: 'unidade' },
      { food: 'melão', amount: 1, unit: 'unidade' },
      { food: 'banana prata', amount: 0.5, unit: 'unidade' },
    ],
  },
  'iogurte-natural': {
    options: [
      { food: 'iogurte grego natural', amount: 120, unit: 'g' },
      { food: 'kefir natural', amount: 200, unit: 'ml' },
      { food: 'leite desnatado', amount: 200, unit: 'ml' },
    ],
  },
  granola: {
    options: [
      { food: 'aveia em flocos', amount: 20, unit: 'g' },
      { food: 'granola caseira sem açúcar', amount: 15, unit: 'g' },
      { food: 'mix de sementes', amount: 15, unit: 'g' },
    ],
  },
  morangos: {
    options: [
      { food: 'mirtilos', amount: 80, unit: 'g' },
      { food: 'framboesas', amount: 80, unit: 'g' },
      { food: 'uva', amount: 10, unit: 'unidade' },
    ],
  },
  'arroz-integral': {
    options: [
      { food: 'quinoa cozida', amount: 130, unit: 'g' },
      { food: 'macarrão integral cozido', amount: 120, unit: 'g' },
      { food: 'batata inglesa cozida', amount: 150, unit: 'g' },
    ],
  },
  'frango-grelhado': {
    options: [
      { food: 'peixe grelhado', amount: 120, unit: 'g' },
      { food: 'carne bovina magra (patinho)', amount: 100, unit: 'g' },
      { food: 'tofu grelhado', amount: 150, unit: 'g' },
    ],
  },
  brocolis: {
    options: [
      { food: 'couve-flor cozida', amount: 80, unit: 'g' },
      { food: 'vagem cozida', amount: 100, unit: 'g' },
      { food: 'espinafre refogado', amount: 80, unit: 'g' },
    ],
  },
  'batata-doce': {
    options: [
      { food: 'inhame cozido', amount: 100, unit: 'g' },
      { food: 'mandioca cozida', amount: 90, unit: 'g' },
      { food: 'abóbora cabotiá', amount: 120, unit: 'g' },
    ],
  },
  castanhas: {
    options: [
      { food: 'amendoim torrado', amount: 30, unit: 'g' },
      { food: 'sementes de girassol', amount: 25, unit: 'g' },
      { food: 'mix de oleaginosas', amount: 30, unit: 'g' },
    ],
  },
  maca: {
    options: [
      { food: 'pera', amount: 1, unit: 'unidade' },
      { food: 'kiwi', amount: 2, unit: 'unidade' },
      { food: 'laranja', amount: 1, unit: 'unidade' },
    ],
  },
  omelete: {
    options: [
      { food: 'tofu mexido', amount: 150, unit: 'g' },
      { food: 'frango desfiado', amount: 80, unit: 'g' },
      { food: 'atum em água', amount: 100, unit: 'g' },
    ],
  },
  abobrinha: {
    options: [
      { food: 'berinjela grelhada', amount: 120, unit: 'g' },
      { food: 'chuchu cozido', amount: 120, unit: 'g' },
      { food: 'pepino japonês refogado', amount: 100, unit: 'g' },
    ],
  },
}

export function getSubstitutionOptions(itemKey) {
  if (!itemKey) return []
  return MEAL_SUBSTITUTIONS[itemKey]?.options ?? []
}
