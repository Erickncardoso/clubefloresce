import { getApiBase, NATIVE_CLIENT_HEADER } from '@/config/env';

export type ApiError = Error & {
  status?: number;
  data?: { message?: string };
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const url = path.startsWith('http') ? path : `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;

  const mergedHeaders = new Headers(headers);
  mergedHeaders.set('Accept', 'application/json');
  mergedHeaders.set('X-CF-Client', NATIVE_CLIENT_HEADER);
  if (!mergedHeaders.has('Content-Type') && rest.body) {
    mergedHeaders.set('Content-Type', 'application/json');
  }
  if (token) {
    mergedHeaders.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: mergedHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/network request failed|failed to connect|timed out/i.test(message)) {
      throw new Error(
        `Sem conexão com a API (${getApiBase()}). Verifique sua internet e tente novamente.`,
      );
    }
    throw error;
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    const trimmed = text.trimStart();
    if (/^<!doctype html|^<html/i.test(trimmed)) {
      throw new Error(
        `Resposta inválida da API (${getApiBase()}). Confira EXPO_PUBLIC_API_BASE e reinicie o Expo.`,
      );
    }
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const err = new Error(
      (data as { message?: string })?.message || `Erro ${response.status}`,
    ) as ApiError;
    err.status = response.status;
    err.data = data as { message?: string };
    throw err;
  }

  return data as T;
}
