/** Fuso do app paciente (Brasil). */
export const CHECKIN_TIMEZONE = "America/Sao_Paulo";

export type CheckInWindowParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
};

export function getCheckInWindowParts(date: Date = new Date()): CheckInWindowParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CHECKIN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: weekdayMap[String(map.weekday)] ?? 0,
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

/** Check-in semanal abre sexta 11h e vai até o fim de segunda (horário BR). */
export function isWeeklyCheckInWindowOpen(date: Date = new Date()): boolean {
  const { weekday, hour, minute } = getCheckInWindowParts(date);

  if (weekday === 5) {
    return hour > 11 || (hour === 11 && minute >= 0);
  }
  if (weekday === 6 || weekday === 0 || weekday === 1) return true;
  return false;
}

export function isFridayCheckInDay(date: Date = new Date()): boolean {
  const { weekday, hour, minute } = getCheckInWindowParts(date);
  return weekday === 5 && (hour > 11 || (hour === 11 && minute >= 0));
}

export function formatNextFridayLabel(date: Date = new Date()): string {
  const { weekday } = getCheckInWindowParts(date);
  let daysUntilFriday = (5 - weekday + 7) % 7;
  if (daysUntilFriday === 0 && !isWeeklyCheckInWindowOpen(date)) {
    daysUntilFriday = 7;
  }
  if (daysUntilFriday === 0) return "sexta-feira";

  const target = new Date(date);
  target.setDate(target.getDate() + daysUntilFriday);
  return target.toLocaleDateString("pt-BR", {
    weekday: "long",
    timeZone: CHECKIN_TIMEZONE,
  });
}
