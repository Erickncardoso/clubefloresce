export function onlyDigits(value: string, max?: number): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  return typeof max === 'number' ? digits.slice(0, max) : digits;
}

export function maskCardNumber(value: string): string {
  const digits = onlyDigits(value, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function maskCardExpiry(value: string): string {
  const digits = onlyDigits(value, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function maskCpf(value: string): string {
  const digits = onlyDigits(value, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function maskCvv(value: string): string {
  return onlyDigits(value, 4);
}

export function maskPhoneBr(value: string): string {
  const digits = onlyDigits(value, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Máscara DD/MM/AAAA — espelha `CfDateInput` do PWA. */
export function maskBirthDateBr(value: string): string {
  const digits = onlyDigits(value, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseBirthDateBrToIso(display: string): string | null {
  const match = String(display || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatBirthDateIsoToBr(iso: string): string {
  const match = String(iso || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return maskBirthDateBr(iso);
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function parseCardExpiration(value: string): { month: number; year: number } {
  const match = String(value || '').trim().match(/^(\d{1,2})\s*\/\s*(\d{2,4})$/);
  if (!match) throw new Error('Validade inválida. Use MM/AA.');
  const month = Number(match[1]);
  let year = Number(match[2]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12) throw new Error('Mês de validade inválido.');
  return { month, year };
}
