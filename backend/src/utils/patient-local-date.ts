import { getWeekStart } from "./week-start";

export function readPatientDateKey(
  headers?: Record<string, string | string[] | undefined>,
): string | null {
  const raw = headers?.["x-patient-date"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

export function resolvePeriodKey(
  frequency: string,
  dateKey?: string | null,
): string {
  const reference = dateKey ? parseDateKey(dateKey) : new Date();

  if (frequency === "daily") {
    if (dateKey) return dateKey;
    return reference.toISOString().slice(0, 10);
  }

  if (frequency === "monthly") {
    const key = dateKey || reference.toISOString().slice(0, 10);
    const [year, month] = key.split("-");
    return `${year}-${month}`;
  }

  return getWeekStart(reference).toISOString();
}
