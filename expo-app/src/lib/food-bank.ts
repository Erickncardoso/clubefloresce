type FoodWithMacros = {
  per100g?: {
    caloriesKcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  } | null;
  nutrients?: {
    per100g?: {
      caloriesKcal?: number;
      proteinG?: number;
      carbsG?: number;
      fatG?: number;
    };
  };
};

function round1(value: number) {
  return Math.round(Number(value) * 10) / 10;
}

export function macrosForFoodRecord(food: FoodWithMacros | null | undefined, grams: number) {
  if (!food?.per100g && !food?.nutrients) {
    return {
      caloriesKcal: 0,
      carbsG: 0,
      proteinG: 0,
      fatG: 0,
    };
  }

  const per100g = food.per100g || food.nutrients?.per100g || {};
  const factor = Math.max(0, Number(grams) || 0) / 100;

  return {
    caloriesKcal: Math.round((Number(per100g.caloriesKcal) || 0) * factor),
    carbsG: round1((Number(per100g.carbsG) || 0) * factor),
    proteinG: round1((Number(per100g.proteinG) || 0) * factor),
    fatG: round1((Number(per100g.fatG) || 0) * factor),
  };
}

export function formatPer100gKcal(value: number) {
  return Math.round(Number(value) || 0).toLocaleString('pt-BR');
}

const TBCA_TRAILING_PARTS = new Set([
  'brasil',
  'in natura',
  'cru',
  'crua',
  'cozido',
  'cozida',
  'grelhado',
  'grelhada',
]);

const TBCA_ADJECTIVES = new Set([
  'integral',
  'refinado',
  'refinada',
  'light',
  'zero',
  'desnatado',
  'desnatada',
  'preto',
  'preta',
  'branco',
  'branca',
]);

/** Nome amigável para exibir — usa displayName da API ou converte formato TBCA/TACO com vírgulas. */
export function formatFoodDisplayLabel(item: {
  name?: string | null;
  displayName?: string | null;
}): string {
  const name = String(item?.name || '').trim();
  const display = String(item?.displayName || '').trim();
  if (display && display !== name) return display;
  return humanizeTbcaFoodName(name);
}

function humanizeTbcaFoodName(name: string): string {
  const trimmed = String(name || '').trim();
  if (!trimmed.includes(',')) return trimmed;

  let parts = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return trimmed;

  while (parts.length > 2 && TBCA_TRAILING_PARTS.has(parts[parts.length - 1].toLowerCase())) {
    parts = parts.slice(0, -1);
  }

  const [head, ...tail] = parts;
  const headLower = head.toLowerCase();

  if ((headLower === 'pão' || headLower === 'pao') && tail.length >= 2) {
    const last = tail[tail.length - 1].toLowerCase();
    if (last === 'forma' || last === 'francês' || last === 'frances') {
      const middle = tail.slice(0, -1).join(' ').trim();
      const suffix = last === 'forma' ? 'forma' : 'francês';
      return middle ? `Pão de ${suffix} de ${middle}` : `Pão ${suffix}`;
    }
  }

  const chunks: string[] = [head];
  for (const part of tail) {
    if (TBCA_ADJECTIVES.has(part.toLowerCase()) && chunks.length > 0) {
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${part}`;
      continue;
    }
    chunks.push(part);
  }

  if (chunks.length === 1) return chunks[0];
  return [chunks[0], ...chunks.slice(1).map((chunk) => `de ${chunk}`)].join(' ');
}
