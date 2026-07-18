import { useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { patientTimeHeaders } from '@/lib/patient-local-time';
import { useAuth } from '@/providers/AuthProvider';

export function usePatientApi() {
  const { token } = useAuth();

  const request = useCallback(async <T>(
    path: string,
    options: RequestInit = {},
  ) => {
    if (!token) throw new Error('Sessão expirada. Faça login novamente.');
    const headers = {
      ...patientTimeHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    };
    return apiFetch<T>(path, { ...options, headers, token });
  }, [token]);

  return { request, token };
}
