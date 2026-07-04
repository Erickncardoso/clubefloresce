import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch } from '@/lib/api';
import {
  clearStoredSession,
  getStoredToken,
  saveStoredToken,
  saveStoredUserId,
} from '@/lib/auth-storage';
import {
  isPatientAppAccessBlocked,
  isPatientAccessBlockedError,
} from '@/lib/patient-access';
import type { LoginResult, OnboardingStatus, PatientUser } from '@/types/patient';

export type PatientProfileData = {
  gender?: string | null;
  birthDate?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  targetWeightKg?: number | null;
  primaryGoal?: string | null;
  workoutsPerWeek?: string | null;
};

type AuthContextValue = {
  user: PatientUser | null;
  token: string | null;
  booting: boolean;
  onboarding: OnboardingStatus | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (payload: Record<string, unknown>) => Promise<{ user: PatientUser; redirectTo?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<PatientUser | null>;
  fetchOnboarding: (force?: boolean) => Promise<OnboardingStatus | null>;
  saveProfile: (partial: PatientProfileData, options?: { complete?: boolean }) => Promise<OnboardingStatus>;
  resolvePostLoginRoute: () => Promise<string>;
  hasSession: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function applySessionFromLogin(data: LoginResult) {
  if (!data.user?.id) throw new Error('Resposta de login inválida.');
  if (data.user.role === 'NUTRICIONISTA') {
    throw new Error('Esta versão é exclusiva para pacientes. Nutricionistas devem usar o painel web.');
  }
  if (!data.token) {
    throw new Error('Token de sessão não recebido. Atualize o backend e tente novamente.');
  }
  await saveStoredToken(data.token);
  await saveStoredUserId(data.user.id);
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PatientUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);

  const refreshUser = useCallback(async () => {
    const activeToken = token || (await getStoredToken());
    if (!activeToken) {
      setUser(null);
      return null;
    }

    try {
      const me = await apiFetch<PatientUser>('/auth/me', { token: activeToken });
      if (me.role !== 'PACIENTE') {
        await clearStoredSession();
        setToken(null);
        setUser(null);
        return null;
      }
      setUser(me);
      if (me.id) await saveStoredUserId(me.id);
      return me;
    } catch {
      await clearStoredSession();
      setToken(null);
      setUser(null);
      return null;
    }
  }, [token]);

  const fetchOnboarding = useCallback(async (force = false) => {
    if (!force && onboarding) return onboarding;
    const activeToken = token || (await getStoredToken());
    if (!activeToken) return null;

    try {
      const data = await apiFetch<OnboardingStatus & { profile?: unknown }>(
        '/patient-profile/me',
        { token: activeToken },
      );
      const status: OnboardingStatus = {
        isComplete: Boolean(data.isComplete),
        missingFields: data.missingFields || [],
      };
      setOnboarding(status);
      return status;
    } catch (err) {
      if (isPatientAccessBlockedError(err)) throw err;
      return null;
    }
  }, [onboarding, token]);

  const saveProfile = useCallback(async (
    partial: PatientProfileData,
    options: { complete?: boolean } = {},
  ) => {
    const activeToken = token || (await getStoredToken());
    if (!activeToken) throw new Error('Sessão expirada.');

    const data = await apiFetch<OnboardingStatus>(
      '/patient-profile/me',
      {
        method: 'PUT',
        token: activeToken,
        body: JSON.stringify({ ...partial, complete: Boolean(options.complete) }),
      },
    );
    const status: OnboardingStatus = {
      isComplete: Boolean(data.isComplete),
      missingFields: data.missingFields || [],
    };
    setOnboarding(status);
    return status;
  }, [token]);

  const resolvePostLoginRoute = useCallback(async () => {
    const current = user || (await refreshUser());
    if (
      current
      && isPatientAppAccessBlocked(current.plan, current.accessExpiresAt, current.approvalEmailSentAt)
    ) {
      return '/assinatura';
    }
    const status = await fetchOnboarding(true);
    if (!status?.isComplete) return '/onboarding';
    return '/inicio';
  }, [fetchOnboarding, refreshUser, user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredToken();
      if (!stored) {
        if (!cancelled) setBooting(false);
        return;
      }
      setToken(stored);
      await refreshUser();
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const session = await applySessionFromLogin(data);
    setToken(session.token!);
    setUser(session.user);
    setOnboarding(null);
    return session;
  }, []);

  const register = useCallback(async (payload: Record<string, unknown>) => {
    const data = await apiFetch<{
      user: PatientUser;
      token?: string;
      redirectTo?: string;
    }>('/auth/patient-registration-request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (data.token && data.user) {
      await saveStoredToken(data.token);
      await saveStoredUserId(data.user.id);
      setToken(data.token);
      setUser(data.user);
      setOnboarding(null);
    }

    return data;
  }, []);

  const logout = useCallback(async () => {
    const activeToken = token || (await getStoredToken());
    try {
      if (activeToken) {
        await apiFetch('/auth/logout', { method: 'POST', token: activeToken });
      }
    } catch {
      /* ignore */
    }
    await clearStoredSession();
    setToken(null);
    setUser(null);
    setOnboarding(null);
  }, [token]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    booting,
    onboarding,
    login,
    register,
    logout,
    refreshUser,
    fetchOnboarding,
    saveProfile,
    resolvePostLoginRoute,
    hasSession: Boolean(token),
  }), [
    booting,
    fetchOnboarding,
    login,
    logout,
    onboarding,
    refreshUser,
    register,
    resolvePostLoginRoute,
    saveProfile,
    token,
    user,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
