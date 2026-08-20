import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getApiBase, NATIVE_CLIENT_HEADER } from '@/config/env';
import { apiFetch } from '@/lib/api';
import { patientTimeHeaders } from '@/lib/patient-local-time';
import {
  hasMealPlan,
  normalizeMealPlanResponse,
  type MealPlanApiResponse,
  type PatientMealPlanRecord,
} from '@/lib/meal-plan-api';
import {
  getCachedMealPlan,
  saveCachedMealPlan,
} from '@/lib/patient-session-cache';
import { useAuth } from '@/providers/AuthProvider';

type PatientMealPlanContextValue = {
  planRecord: PatientMealPlanRecord | null;
  planChecked: boolean;
  setPlanRecord: (record: PatientMealPlanRecord | null) => void;
  meals: ReturnType<typeof normalizeMealPlanResponse>['meals'];
  planTitle: string;
  hasPlan: boolean;
  loading: boolean;
  uploading: boolean;
  error: string;
  fetchPlan: () => Promise<PatientMealPlanRecord | null>;
  uploadPdf: (uri: string, fileName: string) => Promise<PatientMealPlanRecord | null>;
  resetPlan: () => void;
};

const PatientMealPlanContext = createContext<PatientMealPlanContextValue | null>(null);

/** Estado global do plano — espelha `useState('patient-meal-plan')` do PWA. */
export function PatientMealPlanProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [planRecord, setPlanRecord] = useState<PatientMealPlanRecord | null>(null);
  const [planChecked, setPlanChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fetchPromiseRef = useRef<Promise<PatientMealPlanRecord | null> | null>(null);
  const hasCachedPlanRef = useRef(false);
  const planRecordRef = useRef<PatientMealPlanRecord | null>(null);

  useEffect(() => {
    planRecordRef.current = planRecord;
  }, [planRecord]);

  const resetPlan = useCallback(() => {
    setPlanRecord(null);
    setPlanChecked(false);
    setError('');
    setUploading(false);
    fetchPromiseRef.current = null;
    hasCachedPlanRef.current = false;
  }, []);

  const fetchPlan = useCallback(async () => {
    if (fetchPromiseRef.current) return fetchPromiseRef.current;

    const task = (async () => {
      if (!token) {
        setPlanRecord(null);
        setPlanChecked(true);
        return null;
      }

      if (!hasCachedPlanRef.current) setLoading(true);
      setError('');
      try {
        const res = await apiFetch<MealPlanApiResponse>('/meal-plan/me', { token });
        const plan = res.plan ?? null;
        setPlanRecord(plan);
        await saveCachedMealPlan(plan);
        hasCachedPlanRef.current = Boolean(plan);
        return plan;
      } catch (err) {
        if (!hasCachedPlanRef.current) {
          setPlanRecord(null);
        }
        setError((err as Error).message || 'Não foi possível carregar o plano alimentar.');
        return hasCachedPlanRef.current ? planRecordRef.current : null;
      } finally {
        setLoading(false);
        setPlanChecked(true);
      }
    })();

    fetchPromiseRef.current = task;
    try {
      return await task;
    } finally {
      fetchPromiseRef.current = null;
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
      setPlanChecked(true);
      await saveCachedMealPlan(data?.plan ?? null);
      hasCachedPlanRef.current = Boolean(data?.plan);
      return data?.plan ?? null;
    } catch (err) {
      const message = (err as Error).message || 'Não foi possível importar o PDF.';
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      resetPlan();
      return;
    }

    let cancelled = false;
    void (async () => {
      const cached = await getCachedMealPlan();
      if (cancelled) return;
      if (cached) {
        setPlanRecord(cached);
        setPlanChecked(true);
        hasCachedPlanRef.current = true;
      }
      void fetchPlan();
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchPlan, resetPlan, token]);

  const normalized = useMemo(() => normalizeMealPlanResponse({ plan: planRecord }), [planRecord]);

  const value = useMemo<PatientMealPlanContextValue>(() => ({
    planRecord,
    planChecked,
    setPlanRecord,
    meals: normalized.meals,
    planTitle: normalized.title,
    hasPlan: hasMealPlan(planRecord),
    loading,
    uploading,
    error,
    fetchPlan,
    uploadPdf,
    resetPlan,
  }), [
    error,
    fetchPlan,
    loading,
    normalized.meals,
    normalized.title,
    planChecked,
    planRecord,
    resetPlan,
    uploadPdf,
    uploading,
  ]);

  return (
    <PatientMealPlanContext.Provider value={value}>
      {children}
    </PatientMealPlanContext.Provider>
  );
}

export function usePatientMealPlan() {
  const ctx = useContext(PatientMealPlanContext);
  if (!ctx) {
    throw new Error('usePatientMealPlan deve ser usado dentro de PatientMealPlanProvider');
  }
  return ctx;
}
