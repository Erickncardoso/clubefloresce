import { getWeekStartInTimeZone } from "./week-start";
import { CHECKIN_TIMEZONE } from "./checkin-weekly-window";
import {
  entryDateFromKey,
  getDateKeyInTimeZone,
  isValidTimeZone,
} from "./patient-timezone";

export function readPatientDateKey(
  headers?: Record<string, string | string[] | undefined>,
): string | null {
  const raw = headers?.["x-patient-date"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export function readPatientTimeZone(
  headers?: Record<string, string | string[] | undefined>,
): string {
  const raw = headers?.["x-patient-timezone"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = String(value || "").trim();
  if (trimmed && isValidTimeZone(trimmed)) return trimmed;
  return CHECKIN_TIMEZONE;
}

export function resolvePeriodKey(
  frequency: string,
  dateKey?: string | null,
  timeZone: string = CHECKIN_TIMEZONE,
): string {
  const tz = timeZone?.trim() && isValidTimeZone(timeZone) ? timeZone : CHECKIN_TIMEZONE;
  const reference = dateKey ? entryDateFromKey(dateKey) : new Date();

  if (frequency === "daily") {
    if (dateKey) return dateKey;
    return getDateKeyInTimeZone(tz, reference);
  }

  if (frequency === "monthly") {
    const key = dateKey || getDateKeyInTimeZone(tz, reference);
    const [year, month] = key.split("-");
    return `${year}-${month}`;
  }

  return getWeekStartInTimeZone(tz, reference).toISOString();
}
