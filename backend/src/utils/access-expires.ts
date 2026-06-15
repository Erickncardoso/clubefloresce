export function parseAccessExpiresAt(input: unknown): Date {
  const trimmed = String(input ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    throw new Error("Data de acesso inválida. Use o formato AAAA-MM-DD.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error("Data de acesso inválida.");
  }

  // Fim do dia civil no horário de Brasília (acesso válido até 23:59 no dia escolhido).
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T23:59:59.999-03:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Data de acesso inválida.");
  }

  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(date);

  if (formatted !== trimmed) {
    throw new Error("Data de acesso inválida.");
  }

  return date;
}

export function isPatientAccessExpired(accessExpiresAt?: Date | string | null): boolean {
  if (!accessExpiresAt) return false;
  const expiresAt = accessExpiresAt instanceof Date
    ? accessExpiresAt
    : new Date(accessExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return Date.now() > expiresAt.getTime();
}
