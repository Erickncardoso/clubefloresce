export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api'

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = path.startsWith('http')
    ? path
    : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`

  const headers = new Headers(init.headers || {})
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  if (init.body && !headers.has('Content-Type') && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  })

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    const message =
      (data as { error?: string; message?: string } | null)?.error ||
      (data as { message?: string } | null)?.message ||
      `Erro HTTP ${res.status}`
    throw new ApiError(message, res.status, data)
  }

  return data as T
}

export async function apiUpload<T = { url: string }>(
  path: string,
  file: File,
  fieldName = 'file',
): Promise<T> {
  const form = new FormData()
  form.append(fieldName, file)
  return apiFetch<T>(path, { method: 'POST', body: form })
}
