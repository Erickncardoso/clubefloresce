import { useCallback, useMemo, useState } from 'react';
import { usePatientApi } from '@/hooks/usePatientApi';

type CheckInTemplate = {
  id: string;
  title: string;
  description?: string;
  frequency?: string;
  completedThisPeriod?: boolean;
  periodKey?: string;
};

type CheckInStatus = {
  windowOpen?: boolean;
  deadlineLabel?: string;
  showFridayPrompt?: boolean;
};

export function useWeeklyCheckIn() {
  const { request } = usePatientApi();
  const [templates, setTemplates] = useState<CheckInTemplate[]>([]);
  const [status, setStatus] = useState<CheckInStatus>({});
  const [loading, setLoading] = useState(false);

  const canOpenTemplate = useCallback((tpl: CheckInTemplate) => {
    if (tpl.completedThisPeriod) return false;
    if (tpl.frequency === 'weekly' && !status.windowOpen) return false;
    return true;
  }, [status.windowOpen]);

  const pendingCheckIn = useMemo(
    () => templates.some((tpl) => canOpenTemplate(tpl)),
    [canOpenTemplate, templates],
  );

  const loadCheckInAccess = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request<{ templates?: CheckInTemplate[]; status?: CheckInStatus }>(
        '/checkin/templates/active',
      );
      setTemplates(data.templates || []);
      setStatus(data.status || {});
    } catch {
      setTemplates([]);
      setStatus({});
    } finally {
      setLoading(false);
    }
  }, [request]);

  return {
    templates,
    status,
    loading,
    pendingCheckIn,
    canOpenTemplate,
    loadCheckInAccess,
  };
}
