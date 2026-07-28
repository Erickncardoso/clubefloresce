import { useCallback, useMemo, useState } from 'react';
import { usePatientApi } from '@/hooks/usePatientApi';

type CheckInTemplate = {
  id: string;
  title: string;
  description?: string;
  frequency?: string;
  completedThisPeriod?: boolean;
  periodKey?: string;
  invited?: boolean;
  canOpen?: boolean;
  steps?: Array<Record<string, unknown>>;
};

type CheckInStatus = {
  windowOpen?: boolean;
  deadlineLabel?: string;
  showFridayPrompt?: boolean;
  showWaitMessage?: boolean;
  allWeeklyCompleted?: boolean;
  nextOpenLabel?: string;
  hasInvitedPending?: boolean;
};

export function useWeeklyCheckIn() {
  const { request } = usePatientApi();
  const [templates, setTemplates] = useState<CheckInTemplate[]>([]);
  const [status, setStatus] = useState<CheckInStatus>({});
  const [loading, setLoading] = useState(false);

  const canOpenTemplate = useCallback((tpl: CheckInTemplate) => {
    if (tpl.completedThisPeriod) return false;
    if (tpl.canOpen != null) return Boolean(tpl.canOpen);
    if (tpl.invited) return true;
    if (tpl.frequency === 'weekly' && !status.windowOpen) return false;
    return true;
  }, [status.windowOpen]);

  const waitMessage = useMemo(() => {
    if (status.hasInvitedPending) return '';
    if (!status.showWaitMessage && !status.allWeeklyCompleted) return '';

    if (status.allWeeklyCompleted) {
      const next = status.nextOpenLabel || 'sexta-feira';
      return `Você já preencheu o check-in da última semana. Aguarde até ${next} para preencher novamente.`;
    }

    if (!status.windowOpen) {
      const next = status.nextOpenLabel || 'sexta-feira';
      return `O check-in semanal abre na ${next} às 11h. Você pode preencher até segunda-feira.`;
    }

    return '';
  }, [status]);

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
    waitMessage,
    canOpenTemplate,
    loadCheckInAccess,
  };
}
