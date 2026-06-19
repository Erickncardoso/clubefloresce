import { CHECKIN_TIMEZONE } from "./checkin-weekly-window";
import { entryDateFromKey, getDateKeyInTimeZone } from "./patient-timezone";

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getWeekdayInTimeZone(timeZone: string, date: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  });
  const label = formatter.format(date);
  return WEEKDAY_MAP[label] ?? 0;
}

/** Segunda-feira 12:00 UTC da semana civil no fuso informado (evita shift na exibição). */
export function getWeekStartInTimeZone(timeZone: string, date: Date = new Date()): Date {
  const dateKey = getDateKeyInTimeZone(timeZone, date);
  const [year, month, day] = dateKey.split("-").map(Number);
  const reference = entryDateFromKey(dateKey);
  const weekday = getWeekdayInTimeZone(timeZone, reference);
  const diff = weekday === 0 ? -6 : 1 - weekday;
  return new Date(Date.UTC(year, month - 1, day + diff, 12, 0, 0, 0));
}

/** Semana do check-in no fuso do app (Brasil). */
export function getWeekStart(date: Date = new Date()): Date {
  return getWeekStartInTimeZone(CHECKIN_TIMEZONE, date);
}

export type PatientWeekHeaders = {
  patientDate?: string | null;
  patientTimeZone?: string | null;
};

/** Semana atual do paciente conforme data/fuso enviados pelo app. */
export function resolvePatientWeekStart(headers: PatientWeekHeaders = {}): Date {
  const timeZone = headers.patientTimeZone?.trim() || CHECKIN_TIMEZONE;
  const dateKey = headers.patientDate?.trim();
  if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return getWeekStartInTimeZone(timeZone, entryDateFromKey(dateKey));
  }
  return getWeekStartInTimeZone(timeZone, new Date());
}
