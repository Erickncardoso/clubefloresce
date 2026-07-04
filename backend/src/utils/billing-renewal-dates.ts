const BILLING_TIMEZONE = "America/Sao_Paulo";

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
