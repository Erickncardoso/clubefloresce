import { useCallback, useState } from 'react';
import { getApiBase, NATIVE_CLIENT_HEADER } from '@/config/env';
import { apiFetch } from '@/lib/api';
import { patientTimeHeaders } from '@/lib/patient-local-time';
import {
  hasMealPlan,
  normalizeMealPlanResponse,
  type MealPlanApiResponse,
  type PatientMealPlanRecord,
} from '@/lib/meal-plan-api';
import { useAuth } from '@/providers/AuthProvider';

export function usePatientMealPlan() {
  const { token } = useAuth();
  const [planRecord, setPlanRecord] = useState<PatientMealPlanRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const fetchPlan = useCallback(async () => {
    if (!token) {
      setPlanRecord(null);
      return null;
    }

    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<MealPlanApiResponse>('/meal-plan/me', { token });
      setPlanRecord(res.plan ?? null);
      return res.plan ?? null;
    } catch (err) {
      setPlanRecord(null);
      setError((err as Error).message || 'Não foi possível carregar o plano alimentar.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const uploadPdf = useCallback(async (uri: string, fileName: string) => {
    if (!token) throw new Error('Sessão expirada.');

    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', {
        uri,
        name: fileName || 'plano-alimentar.pdf',
        type: 'application/pdf',
      } as unknown as Blob);

      const response = await fetch(`${getApiBase()}/meal-plan/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'X-CF-Client': NATIVE_CLIENT_HEADER,
          ...patientTimeHeaders(),
        },
        body: form,
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) {
        throw new Error(data?.message || 'Não foi possível importar o PDF.');
      }

      setPlanRecord(data?.plan ?? null);
      return data?.plan ?? null;
    } catch (err) {
      const message = (err as Error).message || 'Não foi possível importar o PDF.';
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [token]);

  const normalized = normalizeMealPlanResponse({ plan: planRecord });

  return {
    planRecord,
    meals: normalized.meals,
    planTitle: normalized.title,
    hasPlan: hasMealPlan(planRecord),
    loading,
    uploading,
    error,
    fetchPlan,
    uploadPdf,
  };
}
