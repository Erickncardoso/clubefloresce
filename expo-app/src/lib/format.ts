export function formatCurrency(value: number): string {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatDateBr(value?: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR');
}

export function planLabel(plan?: string | null): string {
  const normalized = String(plan || 'FREE').toUpperCase();
  if (normalized === 'PREMIUM') return 'Premium';
  if (normalized === 'PLATINUM') return 'Platinum';
  return normalized;
}

export function timeGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function firstNameFrom(fullName?: string | null): string {
  const name = String(fullName || '').trim();
  if (!name) return 'Paciente';
  return name.split(/\s+/)[0] || 'Paciente';
}
