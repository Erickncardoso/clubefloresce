/** Normaliza telefone brasileiro para envio via UAZAPI (somente dígitos, com DDI 55). */
export function normalizePhoneForWhatsapp(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;

  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length <= 11 && !digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  return digits.length >= 10 ? digits : null;
}

export function isValidWhatsappPhone(phone: string | null | undefined): boolean {
  return Boolean(normalizePhoneForWhatsapp(phone));
}
