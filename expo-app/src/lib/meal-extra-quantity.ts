const FOOD_UNIT_GRAMS: Array<{ pattern: RegExp; grams: number }> = [
  { pattern: /kiwi/i, grams: 80 },
  { pattern: /maçã|maca\b/i, grams: 130 },
  { pattern: /banana|nanica|caturra|prata/i, grams: 90 },
  { pattern: /ovo/i, grams: 50 },
  { pattern: /pão|pao\b/i, grams: 25 },
  { pattern: /whey|prote[ií]na.*p[oó]|wpc|wpi/i, grams: 30 },
];

const PORTION_MEASURES = [
  { id: 'unidade', defaultGrams: 100 },
  { id: 'colher', defaultGrams: 15 },
  { id: 'fatia', defaultGrams: 30 },
  { id: 'xicara', defaultGrams: 160 },
  { id: 'porcao', defaultGrams: 100 },
  { id: 'dosador', defaultGrams: 30 },
];

export const EXTRA_QUANTITY_UNITS = [
  { id: 'g', label: 'Gramas (g)' },
  { id: 'kg', label: 'Quilogramas (kg)' },
  { id: 'ml', label: 'Mililitros (ml)' },
  { id: 'unidade', label: 'Unidade(s)' },
];

export function guessGramsPerUnit(foodName: string, measureId = 'unidade') {
  const name = String(foodName || '').toLowerCase();
  if (measureId === 'unidade') {
    for (const entry of FOOD_UNIT_GRAMS) {
      if (entry.pattern.test(name)) return entry.grams;
    }
  }
  const measure = PORTION_MEASURES.find((m) => m.id === measureId);
  return measure?.defaultGrams || 100;
}

export function amountToGrams(amount: number, measureId: string, foodName: string) {
  const qty = Math.max(0.1, Number(amount) || 1);
  if (measureId === 'grams' || measureId === 'g') {
    return Math.max(1, Math.round(qty));
  }
  const gramsPerUnit = guessGramsPerUnit(foodName, measureId);
  return Math.max(1, Math.round(qty * gramsPerUnit));
}

export function defaultExtraQuantityForUnit(foodName: string, unit = 'unidade') {
  const gramsPerUnit = guessGramsPerUnit(foodName, 'unidade');

  if (unit === 'unidade') {
    return { amount: 1, unit: 'unidade' };
  }
  if (unit === 'g') {
    return { amount: gramsPerUnit, unit: 'g' };
  }
  if (unit === 'kg') {
    return { amount: Math.round((gramsPerUnit / 1000) * 1000) / 1000, unit: 'kg' };
  }
  if (unit === 'ml') {
    return { amount: gramsPerUnit, unit: 'ml' };
  }
  return { amount: 1, unit: 'unidade' };
}

export function resolveExtraItemGrams(amount: number, unit: string, foodName: string) {
  const qty = Number(amount);
  if (!Number.isFinite(qty) || qty <= 0) return 0;

  if (unit === 'g') return Math.round(qty);
  if (unit === 'kg') return Math.round(qty * 1000);
  if (unit === 'ml') return Math.round(qty);
  if (unit === 'unidade') return amountToGrams(qty, 'unidade', foodName);

  return Math.round(qty);
}

export function formatExtraItemLabel(name: string, amount: number, unit: string) {
  const food = String(name || '').trim();
  if (!food) return '';

  const qty = Number(amount);
  if (!Number.isFinite(qty) || qty <= 0) return food;

  if (unit === 'g') return `${Math.round(qty)} g ${food}`;
  if (unit === 'kg') {
    const label = String(qty).replace('.', ',');
    return `${label} kg ${food}`;
  }
  if (unit === 'ml') return `${Math.round(qty)} ml ${food}`;

  const count = Math.round(qty * 10) / 10;
  if (count === 1) return `1 ${food}`;
  if (Number.isInteger(count)) return `${count} unidades de ${food}`;
  return `${String(count).replace('.', ',')} ${food}`;
}
