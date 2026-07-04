import { useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

export function usePatientApi() {
  const { token } = useAuth();

  const request = useCallback(async <T>(
    path: string,
    options: RequestInit = {},
  ) => {
    if (!token) throw new Error('Sessão expirada. Faça login novamente.');
    return apiFetch<T>(path, { ...options, token });
  }, [token]);

  return { request, token };
}
