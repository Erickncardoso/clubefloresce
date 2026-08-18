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
import { apiFetch, type ApiError } from '@/lib/api';
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
  cpf?: string | null;
  occupation?: string | null;
  maritalStatus?: string | null;
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
  updateProfileName: (name: string) => Promise<PatientUser>;
  updateProfilePhone: (phone: string | null) => Promise<PatientUser>;
  fetchOnboarding: (force?: boolean) => Promise<OnboardingStatus | null>;
  saveProfile: (partial: PatientProfileData, options?: { complete?: boolean }) => Promise<OnboardingStatus>;
  resolvePostLoginRoute: () => Promise<string>;
  changeFirstAccessPassword: (newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
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
  const userRef = useRef<PatientUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshUser = useCallback(async () => {
    const activeToken = token || (await getStoredToken());
    if (!activeToken) {
      setUser(null);
      userRef.current = null;
      return null;
    }

    try {
      const me = await apiFetch<PatientUser>('/auth/me', { token: activeToken });
      if (me.role !== 'PACIENTE') {
        await clearStoredSession();
        setToken(null);
        setUser(null);
        userRef.current = null;
        return null;
      }
      setUser(me);
      userRef.current = me;
      if (me.id) await saveStoredUserId(me.id);
      return me;
    } catch (err) {
      const status = (err as ApiError)?.status;
      if (status === 401 || status === 403) {
        await clearStoredSession();
        setToken(null);
        setUser(null);
        userRef.current = null;
        return null;
      }
      return userRef.current;
    }
  }, [token]);

  const patchProfileMe = useCallback(async (body: { name?: string; phone?: string | null }) => {
    const activeToken = token || (await getStoredToken());
    if (!activeToken) throw new Error('Sessão expirada.');

    const me = await apiFetch<PatientUser>('/auth/me', {
      method: 'PATCH',
      token: activeToken,
      body: JSON.stringify(body),
    });
    setUser(me);
    userRef.current = me;
    if (me.id) await saveStoredUserId(me.id);
    return me;
  }, [token]);

  const updateProfileName = useCallback(async (name: string) => {
    return patchProfileMe({ name });
  }, [patchProfileMe]);

  const updateProfilePhone = useCallback(async (phone: string | null) => {
    const digits = phone?.replace(/\D/g, '') || null;
    return patchProfileMe({ phone: digits });
  }, [patchProfileMe]);

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
      try {
        const me = await apiFetch<PatientUser>('/auth/me', { token: stored });
        if (cancelled) return;
        if (me.role === 'PACIENTE') {
          setUser(me);
          userRef.current = me;
          if (me.id) await saveStoredUserId(me.id);
        } else {
          await clearStoredSession();
          setToken(null);
        }
      } catch (err) {
        const status = (err as ApiError)?.status;
        if (status === 401 || status === 403) {
          await clearStoredSession();
          setToken(null);
          setUser(null);
          userRef.current = null;
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const changeFirstAccessPassword = useCallback(async (newPassword: string) => {
    const activeToken = token || (await getStoredToken());
    if (!activeToken) throw new Error('Sessão expirada.');

    const data = await apiFetch<{ user: PatientUser }>(
      '/auth/first-access/change-password',
      {
        method: 'POST',
        token: activeToken,
        body: JSON.stringify({ newPassword }),
      },
    );
    if (data.user) setUser(data.user);
  }, [token]);

  const deleteAccount = useCallback(async (password: string) => {
    const activeToken = token || (await getStoredToken());
    if (!activeToken) throw new Error('Sessão expirada.');

    await apiFetch<void>('/auth/me', {
      method: 'DELETE',
      token: activeToken,
      body: JSON.stringify({ password }),
    });
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
    updateProfileName,
    updateProfilePhone,
    fetchOnboarding,
    saveProfile,
    resolvePostLoginRoute,
    changeFirstAccessPassword,
    deleteAccount,
    hasSession: Boolean(token || user),
  }), [
    booting,
    changeFirstAccessPassword,
    deleteAccount,
    fetchOnboarding,
    login,
    logout,
    onboarding,
    refreshUser,
    updateProfileName,
    updateProfilePhone,
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
