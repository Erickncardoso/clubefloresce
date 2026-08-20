import { getLocalDateKey } from '@/lib/patient-local-time';

export function shiftDateKey(dateKey: string, daysDelta: number): string {
  const [y, m, d] = String(dateKey || getLocalDateKey()).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + daysDelta);
  return date.toISOString().slice(0, 10);
}

export function formatDiaryDateLabel(dateKey: string): string {
  const today = getLocalDateKey();
  if (dateKey === today) return 'Hoje';
  if (dateKey === shiftDateKey(today, -1)) return 'Ontem';
  if (dateKey === shiftDateKey(today, -2)) return 'Anteontem';
  return formatDiaryDatePillLabel(dateKey);
}

/** Ex.: "19 de ago" — sempre data civil, sem "Hoje"/"Ontem". */
export function formatDiaryDatePillLabel(dateKey: string): string {
  try {
    const [y, m, d] = String(dateKey || '').slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return String(dateKey || '');
    return new Date(y, m - 1, d)
      .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
      .replace(/\./g, '');
  } catch {
    return String(dateKey || '');
  }
}

export const DIARY_DATE_OPTIONS = [
  { id: 'today', label: 'Hoje', offset: 0 },
  { id: 'yesterday', label: 'Ontem', offset: -1 },
  { id: 'day_before', label: 'Anteontem', offset: -2 },
] as const;

export function dateKeyForOffset(offset: number): string {
  return shiftDateKey(getLocalDateKey(), offset);
}

export function compareDateKeys(a: string, b: string): number {
  return String(a || '').localeCompare(String(b || ''));
}

export function diaryDateChipOffset(dateKey: string): number | null {
  const today = getLocalDateKey();
  const key = String(dateKey || '').slice(0, 10);
  if (key === today) return 0;
  if (key === dateKeyForOffset(-1)) return -1;
  if (key === dateKeyForOffset(-2)) return -2;
  return null;
}

export function parseDateKeyParts(dateKey: string): { year: number; month: number; day: number } | null {
  const match = String(dateKey || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function dateKeyFromLocalParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export type CalendarMonthCell = {
  key: string;
  day: number;
  dateKey: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  disabled: boolean;
  label: string;
};

export function buildCalendarMonthCells(
  year: number,
  month: number,
  options: {
    selectedDateKey?: string;
    todayDateKey?: string;
    maxDateKey?: string;
    minDateKey?: string;
  } = {},
): CalendarMonthCell[] {
  const today = options.todayDateKey ?? getLocalDateKey();
  const max = options.maxDateKey ?? today;
  const selected = options.selectedDateKey ?? '';
  const min = options.minDateKey;
  const monthIndex = month - 1;
  const firstOfMonth = new Date(year, monthIndex, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: CalendarMonthCell[] = [];

  for (let i = 0; i < 42; i += 1) {
    const dayIndex = i - startOffset + 1;
    const date = new Date(year, monthIndex, dayIndex);
    const inMonth = dayIndex >= 1 && dayIndex <= daysInMonth;
    const dateKeyStr = dateKeyFromLocalParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
    let disabled = !inMonth;
    if (!disabled && compareDateKeys(dateKeyStr, max) > 0) disabled = true;
    if (!disabled && min && compareDateKeys(dateKeyStr, min) < 0) disabled = true;

    cells.push({
      key: `${year}-${monthIndex}-${i}`,
      day: date.getDate(),
      dateKey: dateKeyStr,
      inMonth,
      isToday: dateKeyStr === today,
      isSelected: dateKeyStr === selected,
      disabled,
      label: date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    });
  }

  return cells;
}

export function withDiaryDateQuery(path: string, dateKey: string): string {
  const value = String(dateKey || getLocalDateKey()).trim();
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}date=${encodeURIComponent(value)}`;
}
