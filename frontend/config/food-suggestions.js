/**
 * Stub local até o banco de alimentos oficial.
 * Quando a API existir, troque findFoodByName / FOOD_CATALOG por fetch.
 */
export const FOOD_CATALOG = [
  { id: 'arroz-branco', name: 'Arroz branco cozido', per100g: { caloriesKcal: 130, carbsG: 28, proteinG: 2.7, fatG: 0.3 } },
  { id: 'arroz-integral', name: 'Arroz integral cozido', per100g: { caloriesKcal: 124, carbsG: 26, proteinG: 2.6, fatG: 1 } },
  { id: 'frango-grelhado', name: 'Frango grelhado', per100g: { caloriesKcal: 165, carbsG: 0, proteinG: 31, fatG: 3.6 } },
  { id: 'frango-assado', name: 'Frango assado', per100g: { caloriesKcal: 190, carbsG: 0, proteinG: 29, fatG: 7.4 } },
  { id: 'carne-patinho', name: 'Carne bovina (patinho)', per100g: { caloriesKcal: 176, carbsG: 0, proteinG: 32, fatG: 4.5 } },
  { id: 'peixe-grelhado', name: 'Peixe grelhado', per100g: { caloriesKcal: 128, carbsG: 0, proteinG: 26, fatG: 2.5 } },
  { id: 'ovo-cozido', name: 'Ovo cozido', per100g: { caloriesKcal: 155, carbsG: 1.1, proteinG: 13, fatG: 11 } },
  { id: 'pure-batata', name: 'Purê de batata', per100g: { caloriesKcal: 88, carbsG: 17, proteinG: 1.8, fatG: 0.5 } },
  { id: 'batata-doce', name: 'Batata doce cozida', per100g: { caloriesKcal: 86, carbsG: 20, proteinG: 1.6, fatG: 0.1 } },
  { id: 'batata-inglesa', name: 'Batata inglesa cozida', per100g: { caloriesKcal: 87, carbsG: 20, proteinG: 1.9, fatG: 0.1 } },
  { id: 'brocolis', name: 'Brócolis cozido', per100g: { caloriesKcal: 35, carbsG: 7, proteinG: 2.4, fatG: 0.4 } },
  { id: 'cenoura', name: 'Cenoura crua', per100g: { caloriesKcal: 41, carbsG: 10, proteinG: 0.9, fatG: 0.2 } },
  { id: 'cenoura-ralada', name: 'Cenoura ralada', per100g: { caloriesKcal: 41, carbsG: 10, proteinG: 0.9, fatG: 0.2 } },
  { id: 'abobrinha', name: 'Abobrinha cozida', per100g: { caloriesKcal: 17, carbsG: 3.1, proteinG: 1.2, fatG: 0.3 } },
  { id: 'salada-verde', name: 'Salada verde', per100g: { caloriesKcal: 15, carbsG: 2.9, proteinG: 1.4, fatG: 0.2 } },
  { id: 'feijao-carioca', name: 'Feijão carioca cozido', per100g: { caloriesKcal: 76, carbsG: 13.6, proteinG: 4.8, fatG: 0.5 } },
  { id: 'feijao-preto', name: 'Feijão preto cozido', per100g: { caloriesKcal: 77, carbsG: 14, proteinG: 4.5, fatG: 0.5 } },
  { id: 'macarrao', name: 'Macarrão cozido', per100g: { caloriesKcal: 131, carbsG: 25, proteinG: 5, fatG: 1.1 } },
  { id: 'pao-integral', name: 'Pão integral', per100g: { caloriesKcal: 247, carbsG: 41, proteinG: 13, fatG: 3.4 } },
  { id: 'iogurte-natural', name: 'Iogurte natural', per100g: { caloriesKcal: 61, carbsG: 4.7, proteinG: 3.5, fatG: 3.3 } },
  { id: 'banana', name: 'Banana', per100g: { caloriesKcal: 89, carbsG: 23, proteinG: 1.1, fatG: 0.3 } },
  { id: 'maca', name: 'Maçã', per100g: { caloriesKcal: 52, carbsG: 14, proteinG: 0.3, fatG: 0.2 } },
  { id: 'aveia', name: 'Aveia em flocos', per100g: { caloriesKcal: 394, carbsG: 66, proteinG: 14, fatG: 8.5 } },
  { id: 'legumes-mistos', name: 'Legumes cozidos', per100g: { caloriesKcal: 65, carbsG: 13, proteinG: 2.5, fatG: 0.4 } },
]

export function findFoodByName(name) {
  const normalized = String(name || '').trim().toLowerCase()
  if (!normalized) return null
  return FOOD_CATALOG.find((food) => food.name.toLowerCase() === normalized) || null
}

export function findFoodById(foodId) {
  if (!foodId) return null
  return FOOD_CATALOG.find((food) => food.id === foodId) || null
}

export function macrosForFood(food, grams) {
  const g = Math.max(1, Math.round(Number(grams) || 100))
  const ratio = g / 100
  return {
    caloriesKcal: Math.max(0, Math.round(food.per100g.caloriesKcal * ratio)),
    carbsG: roundMacro(food.per100g.carbsG * ratio),
    proteinG: roundMacro(food.per100g.proteinG * ratio),
    fatG: roundMacro(food.per100g.fatG * ratio),
  }
}

function roundMacro(value) {
  return Math.round(Number(value) * 10) / 10
}
