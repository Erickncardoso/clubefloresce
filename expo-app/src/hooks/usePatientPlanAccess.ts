import { useMemo } from 'react';

import {
  isPatientFreeBasicAccessActive,
  isPatientFullAccessActive,
} from '@/lib/patient-access';
import { useAuth } from '@/providers/AuthProvider';

/** Plano gratuito vs assinatura paga/liberada manualmente. */
export function usePatientPlanAccess() {
  const { user } = useAuth();

  return useMemo(() => {
    const plan = user?.plan;
    const accessExpiresAt = user?.accessExpiresAt;
    const approvalEmailSentAt = user?.approvalEmailSentAt;
    const isFreePlan = isPatientFreeBasicAccessActive(plan);
    const hasPaidAccess = isPatientFullAccessActive(
      plan,
      accessExpiresAt,
      approvalEmailSentAt,
    );

    return {
      isFreePlan,
      hasPaidAccess,
      canAccessDieta: hasPaidAccess,
      canAccessEvolucao: hasPaidAccess,
    };
  }, [user?.accessExpiresAt, user?.approvalEmailSentAt, user?.plan]);
}
