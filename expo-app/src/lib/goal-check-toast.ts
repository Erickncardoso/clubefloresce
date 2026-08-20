import type { PatientGoal } from '@/lib/patient-goals-core';
import { toastSuccess } from '@/lib/app-toast';

function formatSleepDuration(minutes: number) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins ? `${hours}h${String(mins).padStart(2, '0')}` : `${hours}h`;
}

function formatWaterLiters(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.max(0, Number(value) || 0));
}

export function buildGoalCheckToast(
  goalId: string,
  options?: {
    goal?: PatientGoal;
    stepLiters?: number;
    sleepDurationMinutes?: number;
    waterCurrentLiters?: number;
    waterGoalLiters?: number;
  },
) {
  if (goalId === 'water') {
    const ml = Math.round((options?.stepLiters ?? 0.25) * 1000);
    const current = options?.waterCurrentLiters;
    const goal = options?.waterGoalLiters;
    let subtitle: string | undefined;

    if (current != null && goal != null && goal > 0) {
      const pct = Math.min(100, Math.round((current / goal) * 100));
      if (pct >= 100) {
        subtitle = `Meta do dia · ${formatWaterLiters(goal)} L`;
      } else {
        const remainingMl = Math.max(0, Math.round((goal - current) * 1000));
        subtitle = `${formatWaterLiters(current)} de ${formatWaterLiters(goal)} L · faltam ${remainingMl} ml`;
      }
    }

    return toastSuccess(`+${ml} ml`, subtitle);
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
