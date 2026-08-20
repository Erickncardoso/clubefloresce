export type WeightChartPoint = {
  label: string;
  weightKg: number;
  date: Date;
};

export type WeightEntryLike = {
  weightKg: number;
  weekStart?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function formatWeightDisplay(value: number) {
  const fixed = Number(value).toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}

export function entryDate(entry: WeightEntryLike) {
  const raw = entry.updatedAt || entry.createdAt || entry.weekStart;
  const date = new Date(raw || 0);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function formatWeightHistoryDate(value: string | Date | null | undefined) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

export function buildDaySeries(entries: WeightEntryLike[]): WeightChartPoint[] {
  return [...entries]
    .sort((a, b) => entryDate(a).getTime() - entryDate(b).getTime())
    .map((entry) => ({
      label: entryDate(entry).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      weightKg: entry.weightKg,
      date: entryDate(entry),
    }));
}

export function buildMonthSeries(entries: WeightEntryLike[]): WeightChartPoint[] {
  const buckets = new Map<string, { total: number; count: number; date: Date }>();

  for (const entry of entries) {
    const date = entryDate(entry);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const prev = buckets.get(key);
    if (!prev) {
      buckets.set(key, { total: entry.weightKg, count: 1, date });
      continue;
    }
    prev.total += entry.weightKg;
    prev.count += 1;
    if (date.getTime() > prev.date.getTime()) prev.date = date;
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ total, count, date }) => ({
      label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      weightKg: total / count,
      date,
    }));
}

export function chartYRange(points: WeightChartPoint[], goalKg?: number | null) {
  const values = points.map((point) => point.weightKg);
  if (goalKg != null && Number.isFinite(goalKg)) values.push(goalKg);
  if (!values.length) return { min: 70, max: 90 };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(1, (max - min) * 0.18 || 2);
  return { min: min - pad, max: max + pad };
}

export function yTicks(min: number, max: number, count = 5) {
  if (count <= 1) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}
