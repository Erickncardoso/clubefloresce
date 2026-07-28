import type { PatientGoal } from '@/lib/patient-goals-core';
import { toastSuccess } from '@/lib/app-toast';

function formatSleepDuration(minutes: number) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins ? `${hours}h${String(mins).padStart(2, '0')}` : `${hours}h`;
}

export function buildGoalCheckToast(
  goalId: string,
  options?: {
    goal?: PatientGoal;
    stepLiters?: number;
    sleepDurationMinutes?: number;
  },
) {
  if (goalId === 'water') {
    const ml = Math.round((options?.stepLiters ?? 0.25) * 1000);
    return toastSuccess(`+${ml} ml registrado`);
  }
  if (goalId === 'food') {
    return toastSuccess('Refeição livre registrada');
  }
  if (goalId === 'exercise') {
    return toastSuccess('Treino registrado');
  }
  if (goalId === 'sleep') {
    return toastSuccess(
      'Sono registrado',
      options?.sleepDurationMinutes != null
        ? formatSleepDuration(options.sleepDurationMinutes)
        : undefined,
    );
  }

  const label = options?.goal?.label?.trim() || 'Meta';
  return toastSuccess(`${label} registrada`);
}

export function buildGoalBatchSaveToast(goalId: string) {
  if (goalId === 'food') return toastSuccess('Registros salvos');
  if (goalId === 'exercise') return toastSuccess('Treinos salvos');
  if (goalId === 'sleep') return toastSuccess('Sono salvo');
  if (goalId === 'water') return toastSuccess('Hidratação salva');
  return toastSuccess('Meta salva');
}
