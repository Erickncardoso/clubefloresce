export function getDateKeyInTimeZone(timeZone: string, date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function resolvePatientDateKey(headers: {
  patientDate?: string | null;
  patientTimeZone?: string | null;
}): string {
  const raw = headers.patientDate?.trim();
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const timeZone = headers.patientTimeZone?.trim();
  if (timeZone) return getDateKeyInTimeZone(timeZone);

  return getDateKeyInTimeZone("UTC");
}

export function entryDateFromKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

export function readPatientTimeHeaders(req: {
  header(name: string): string | undefined;
}): { patientDate?: string; patientTimeZone?: string } {
  return {
    patientDate: req.header("x-patient-date"),
    patientTimeZone: req.header("x-patient-timezone"),
  };
}

export function isValidTimeZone(timeZone: string): boolean {
  const zone = timeZone?.trim();
  if (!zone) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export const DEFAULT_PATIENT_TIMEZONE = "America/Sao_Paulo";
