import { useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { isPatientAccessBlockedError, isPatientPremiumRequiredError } from '@/lib/patient-access';
import { notifyPatientAccessBlocked } from '@/lib/patient-access-sync';
import { useDiaryDate } from '@/hooks/useDiaryDate';
import { useAuth } from '@/providers/AuthProvider';

export function usePatientApi() {
  const { token } = useAuth();
  const { diaryHeaders } = useDiaryDate();

  const request = useCallback(async <T>(
    path: string,
    options: RequestInit = {},
  ) => {
    if (!token) throw new Error('Sessão expirada. Faça login novamente.');
    const headers = {
      ...diaryHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    };
    try {
      return await apiFetch<T>(path, { ...options, headers, token });
    } catch (err) {
      if (isPatientAccessBlockedError(err) || isPatientPremiumRequiredError(err)) {
        notifyPatientAccessBlocked();
      }
      throw err;
    }
  }, [diaryHeaders, token]);

  return { request, token };
}
