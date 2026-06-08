/** Cardápio prescrito do paciente (mock até API de plano alimentar). */

export const MEAL_ORDER = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner']

/** Janelas do dia (horário local) para exibir a refeição atual. */
export const MEAL_TIME_SLOTS = [
  { id: 'breakfast', start: 5 * 60, end: 9 * 60 + 59 },
  { id: 'snack1', start: 10 * 60, end: 11 * 60 + 29 },
  { id: 'lunch', start: 11 * 60 + 30, end: 14 * 60 + 59 },
  { id: 'snack2', start: 15 * 60, end: 17 * 60 + 59 },
  { id: 'dinner', start: 18 * 60, end: 4 * 60 + 59, wrapsMidnight: true },
]

export const MEAL_PLAN = {
  breakfast: {
    short: 'Café',
    label: 'Café da manhã',
    index: 1,
    image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80',
    items: [
      { key: 'pao-integral', food: 'pão integral', amount: 1, unit: 'fatia' },
      { key: 'cottage', food: 'cottage', amount: 2, unit: 'colher', qualifier: 'sopa' },
      { key: 'mamao', food: 'mamão papaya', amount: 0.5, unit: 'unidade' },
      { key: 'cha-verde', food: 'chá verde', amount: 200, unit: 'ml' },
    ],
  },
  snack1: {
    short: 'Lanche',
    label: 'Lanche da manhã',
    index: 2,
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80',
    items: [
      { key: 'iogurte-natural', food: 'iogurte natural', amount: 170, unit: 'g' },
      { key: 'granola', food: 'granola sem açúcar', amount: 1, unit: 'colher', qualifier: 'sopa' },
      { key: 'morangos', food: 'morangos', amount: 100, unit: 'g' },
    ],
  },
  lunch: {
    short: 'Almoço',
    label: 'Almoço',
    index: 3,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
    items: [
      { key: 'arroz-integral', food: 'arroz integral', amount: 150, unit: 'g' },
      { key: 'frango-grelhado', food: 'frango grelhado', amount: 120, unit: 'g' },
      { key: 'brocolis', food: 'brócolis refogado', amount: 80, unit: 'g' },
      { key: 'batata-doce', food: 'batata doce', amount: 100, unit: 'g' },
    ],
  },
  snack2: {
    short: 'Lanche',
    label: 'Lanche da tarde',
    index: 4,
    image: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=800&q=80',
    items: [
      { key: 'castanhas', food: 'mix de castanhas', amount: 30, unit: 'g' },
      { key: 'maca', food: 'maçã', amount: 1, unit: 'unidade' },
      { key: 'agua-limao', food: 'água com limão', amount: 300, unit: 'ml' },
    ],
  },
  dinner: {
    short: 'Jantar',
    label: 'Jantar',
    index: 5,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
    items: [
      { key: 'salada-verde', food: 'salada verde', unit: 'avontade' },
      { key: 'omelete', food: 'omelete', amount: 2, unit: 'ovos' },
      { key: 'abobrinha', food: 'abobrinha grelhada', amount: 120, unit: 'g' },
    ],
  },
}

export function getMealIdForTime(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes()

  for (const slot of MEAL_TIME_SLOTS) {
    if (slot.wrapsMidnight) {
      if (minutes >= slot.start || minutes <= slot.end) return slot.id
      continue
    }
    if (minutes >= slot.start && minutes <= slot.end) return slot.id
  }

  return 'breakfast'
}

export function getMealPlanEntry(mealId) {
  return MEAL_PLAN[mealId] || MEAL_PLAN.lunch
}
