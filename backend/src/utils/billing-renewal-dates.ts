const BILLING_TIMEZONE = "America/Sao_Paulo";
const BILLING_OFFSET = "-03:00";

/** Data civil AAAA-MM-DD no fuso de Brasília. */
export function formatDateKeyInTimeZone(date: Date, timeZone = BILLING_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

export function addDaysToDateKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function addMonthsToDateKey(key: string, months: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const idx = year * 12 + (month - 1) + Math.max(0, Math.round(Number(months) || 0));
  const nextYear = Math.floor(idx / 12);
  const nextMonth = (idx % 12) + 1;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  const nextDay = Math.min(day, lastDay);
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
}

function endOfCivilDayInBrasilia(key: string): Date {
  return new Date(`${key}T23:59:59.999${BILLING_OFFSET}`);
}

/** Mensalidade: mesmo dia civil no mês seguinte (dia 19 → próximo 19), não +30 dias. */
export function addBillingPeriod(
  from = new Date(),
  frequency = 1,
  frequencyType: "days" | "months" = "days",
): Date {
  const startKey = formatDateKeyInTimeZone(from);
  const amount = Math.max(1, Math.round(Number(frequency) || 1));
  const nextKey = frequencyType === "months"
    ? addMonthsToDateKey(startKey, amount)
    : addDaysToDateKey(startKey, amount);
  return endOfCivilDayInBrasilia(nextKey);
}

export function accessExpiresDateKey(accessExpiresAt: Date): string {
  return formatDateKeyInTimeZone(accessExpiresAt);
}

export function renewalDateWindowKeys(now = new Date()) {
  const todayKey = formatDateKeyInTimeZone(now);
  return {
    todayKey,
    tomorrowKey: addDaysToDateKey(todayKey, 1),
    yesterdayKey: addDaysToDateKey(todayKey, -1),
  };
}

/** Janela UTC ampla para buscar candidatas e filtrar por dia civil BRT. */
export function renewalQueryWindow(now = new Date()) {
  const { todayKey } = renewalDateWindowKeys(now);
  const startKey = addDaysToDateKey(todayKey, -3);
  const endKey = addDaysToDateKey(todayKey, 4);
  return {
    gte: new Date(`${startKey}T03:00:00.000Z`),
    lte: new Date(`${endKey}T02:59:59.999Z`),
  };
}
