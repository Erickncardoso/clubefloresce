import { apiFetch } from '@/lib/api'

export function forgotPassword(email: string) {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email, app: 'admin' }),
  })
}

export function validatePasswordResetToken(token: string) {
  const qs = new URLSearchParams({ token })
  return apiFetch(`/auth/password-reset/validate?${qs.toString()}`)
}

export function resetPassword(token: string, newPassword: string) {
  return apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })
}

export function fetchSetupNutricionistaStatus() {
  return apiFetch<{ enabled: boolean }>('/auth/setup/nutricionista/status')
}

export function createSetupNutricionista(
  payload: { name: string; email: string; password: string },
  setupKey?: string,
) {
  const headers: HeadersInit = {}
  if (setupKey) headers['x-setup-key'] = setupKey
  return apiFetch('/auth/setup/nutricionista', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers,
  })
}
