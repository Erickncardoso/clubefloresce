import { maskCpf, maskPhoneBr, onlyDigits } from '@/lib/masks';
import type { PatientProfileData } from '@/providers/AuthProvider';

export const GENDER_LABELS: Record<string, string> = {
  female: 'Feminino',
  male: 'Masculino',
  other: 'Outro',
  prefer_not_say: 'Prefiro não informar',
};

export const MARITAL_LABELS: Record<string, string> = {
  single: 'Solteiro(a)',
  married: 'Casado(a)',
  divorced: 'Divorciado(a)',
  widowed: 'Viúvo(a)',
  stable_union: 'União estável',
  other: 'Outro',
};

export function formatProfileBirthDate(iso?: string | null): string {
  if (!iso) return '-';
  const date = new Date(`${iso}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return '-';
  const label = date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 0 || age > 120) return label;
  return `${label} (${age} ${age === 1 ? 'ano' : 'anos'})`;
}

export function isoToBirthDateBr(iso?: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function displayCpf(value?: string | null): string {
  const digits = onlyDigits(String(value || ''), 11);
  if (!digits) return '-';
  return maskCpf(digits);
}

export function displayPhone(value?: string | null): string {
  let digits = onlyDigits(String(value || ''), 13);
  if (!digits) return '-';
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  const masked = maskPhoneBr(digits);
  if (!masked) return '-';
  return `+55 ${masked}`;
}

export function phoneToDraft(value?: string | null): string {
  let digits = onlyDigits(String(value || ''), 13);
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  return maskPhoneBr(digits);
}

export function cpfToDraft(value?: string | null): string {
  return maskCpf(String(value || ''));
}

export function displayOccupation(profile?: PatientProfileData | null): string {
  const value = profile?.occupation?.trim();
  return value || '-';
}

export function displayMarital(profile?: PatientProfileData | null): string {
  if (!profile?.maritalStatus) return '-';
  return MARITAL_LABELS[profile.maritalStatus] || '-';
}

export function displayGender(profile?: PatientProfileData | null): string {
  if (!profile?.gender) return '-';
  return GENDER_LABELS[profile.gender] || '-';
}
