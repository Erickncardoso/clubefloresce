/** Espelha a regra do backend para exibir status de acesso no painel. */
export function isPatientAccessExpired(accessExpiresAt?: Date | string | null): boolean {
  if (!accessExpiresAt) return false
  const expiresAt = accessExpiresAt instanceof Date
    ? accessExpiresAt
    : new Date(accessExpiresAt)
  if (Number.isNaN(expiresAt.getTime())) return false
  return Date.now() > expiresAt.getTime()
}

export const PATIENT_ACCESS_EXPIRED_MESSAGE =
  'Seu acesso ao Clube Florescer expirou. Entre em contato com a nutricionista.'

export function getFetchErrorMessage(err: unknown): string {
  return String(
    (err as { data?: { message?: string }; message?: string })?.data?.message
    || (err as { message?: string })?.message
    || '',
  )
}

export function isPatientAccessBlockedMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('acesso ao clube florescer expirou')
    || normalized.includes('acesso expirado')
    || normalized.includes('conta desativada')
}

export function isPatientAccessBlockedError(err: unknown): boolean {
  const status = (err as { statusCode?: number; status?: number })?.statusCode
    ?? (err as { status?: number })?.status
  if (status !== 403) return false
  return isPatientAccessBlockedMessage(getFetchErrorMessage(err))
}
