import { useCallback, useState } from 'react';
import { usePatientApi } from '@/hooks/usePatientApi';

/** Só leitura de status — o app nativo não processa pagamentos (Guideline 3.1.1). */
export function useBilling() {
  const { request } = usePatientApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      return await request('/billing/subscription/me');
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [request]);

  return {
    loading,
    error,
    setError,
    fetchSubscription,
  };
}
