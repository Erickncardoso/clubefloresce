export const FOOD_EQUIVALENT_GROUPS = [
  { id: 'carbs', label: 'Carboidrato', examples: 'arroz, batata doce, macarrão integral' },
  { id: 'protein', label: 'Proteína magra', examples: 'frango, peixe, ovo, tofu' },
  { id: 'legume', label: 'Leguminosa', examples: 'feijão, lentilha, grão-de-bico' },
  { id: 'vegetable', label: 'Vegetal', examples: 'salada, legumes cozidos, refogado' },
  { id: 'fruit', label: 'Fruta', examples: 'banana, maçã, mamão, morango' },
  { id: 'dairy', label: 'Laticínio', examples: 'iogurte natural, queijo branco, leite' },
  { id: 'fat', label: 'Gordura boa', examples: 'azeite, castanhas, abacate' },
  { id: 'other', label: 'Outro grupo', examples: 'descreva as opções' },
]

export function findEquivalentGroup(groupId) {
  return FOOD_EQUIVALENT_GROUPS.find((item) => item.id === groupId) || null
}

export function formatPortionUnit(amount) {
  const value = Number(String(amount || '').replace(',', '.'))
  if (Number.isFinite(value) && value > 1) return 'porções'
  return 'porção'
}
