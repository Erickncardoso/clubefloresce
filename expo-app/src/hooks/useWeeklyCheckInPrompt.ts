import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { usePatientApi } from '@/hooks/usePatientApi';

type CheckInTemplate = {
  id: string;
  periodKey?: string;
  frequency?: string;
  completedThisPeriod?: boolean;
};

type CheckInStatus = {
  windowOpen?: boolean;
  deadlineLabel?: string;
  showFridayPrompt?: boolean;
};

function fridayPromptStorageKey(period: string) {
  return `cf-checkin-friday-prompt:${period}`;
}

function canOpenTemplate(tpl: CheckInTemplate, status: CheckInStatus) {
  if (tpl.completedThisPeriod) return false;
  if (tpl.frequency === 'weekly' && !status.windowOpen) return false;
  return true;
}

/** Check-in semanal (sex–seg): status, banner e popup de sexta. */
export function useWeeklyCheckInPrompt() {
  const router = useRouter();
  const { request } = usePatientApi();
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>({});
  const [activeTemplates, setActiveTemplates] = useState<CheckInTemplate[]>([]);
  const [fridayPromptOpen, setFridayPromptOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadCheckInAccess = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request<{ templates?: CheckInTemplate[]; status?: CheckInStatus }>(
        '/checkin/templates/active',
      );
      const templates = data.templates || [];
      const status = data.status || {};
      setActiveTemplates(templates);
      setCheckInStatus(status);

      const pending = templates.some((tpl) => canOpenTemplate(tpl, status));
      const period = templates.find((tpl) => tpl.periodKey)?.periodKey || 'current';
      if (status.showFridayPrompt && pending) {
        const stored = await AsyncStorage.getItem(fridayPromptStorageKey(period));
        if (stored !== '1') setFridayPromptOpen(true);
      }
    } catch {
      setActiveTemplates([]);
      setCheckInStatus({});
    } finally {
      setLoading(false);
    }
  }, [request]);

  const dismissFridayPrompt = useCallback(async () => {
    setFridayPromptOpen(false);
    const period = activeTemplates.find((tpl) => tpl.periodKey)?.periodKey || 'current';
    await AsyncStorage.setItem(fridayPromptStorageKey(period), '1');
  }, [activeTemplates]);

  const goToCheckIn = useCallback(async () => {
    await dismissFridayPrompt();
    router.push('/check-in' as never);
  }, [dismissFridayPrompt, router]);

  const pendingCheckIn = useMemo(
    () => activeTemplates.some((tpl) => canOpenTemplate(tpl, checkInStatus)),
    [activeTemplates, checkInStatus],
  );

  return {
    checkInStatus,
    pendingCheckIn,
    fridayPromptOpen,
    loading,
    loadCheckInAccess,
    dismissFridayPrompt,
    goToCheckIn,
  };
}
