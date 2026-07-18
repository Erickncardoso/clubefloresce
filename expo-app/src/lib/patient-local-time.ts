export function getPatientTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getLocalDateKey(date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: getPatientTimeZone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

export function patientTimeHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'X-Patient-Timezone': getPatientTimeZone(),
    'X-Patient-Date': getLocalDateKey(),
    ...extra,
  };
}
