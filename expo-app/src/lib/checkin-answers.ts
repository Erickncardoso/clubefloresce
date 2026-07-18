import { addDaysToDateKey, formatDateKeyPtBr } from '@/lib/local-date';

type CheckinStep = {
  id: string;
  type?: string;
  label?: string;
  question?: string;
  min?: number;
  max?: number;
  unit?: string;
  yesLabel?: string;
  noLabel?: string;
};

const FOOD_LABELS: Record<number, string> = {
  1: 'Muito ruim',
  2: 'Ruim',
  3: 'Regular',
  4: 'Boa',
  5: 'Excelente',
};

const SCALE_LABELS: Record<number, string> = {
  1: 'Péssimo',
  2: 'Ruim',
  3: 'Regular',
  4: 'Bom',
  5: 'Excelente',
};

export function formatCheckinAnswer(step: CheckinStep | undefined, value: unknown): string {
  if (value == null || value === '') return '—';
  const type = step?.type || 'text';

  if (type === 'food') return FOOD_LABELS[Number(value)] || String(value);

  if (type === 'water') {
    const liters = Number(value);
    if (!Number.isFinite(liters)) return String(value);
    const rounded = Math.round(liters * 100) / 100;
    const text = rounded % 1 === 0
      ? String(rounded)
      : rounded.toFixed(2).replace(/0$/, '').replace(/\.$/, '').replace('.', ',');
    return `${text} L`;
  }

  if (type === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    const rounded = Math.round(n * 100) / 100;
    const text = rounded % 1 === 0
      ? String(rounded)
      : rounded.toFixed(2).replace(/0$/, '').replace(/\.$/, '').replace('.', ',');
    return `${text}${step?.unit ? ` ${step.unit}` : ''}`;
  }

  if (type === 'exercise') {
    const yes = step?.yesLabel || 'Sim';
    const no = step?.noLabel || 'Não';
    return value === true || value === 'true' ? yes : no;
  }

  if (type === 'scale') {
    const score = Number(value);
    const max = Math.max(1, Number(step?.max) || 5);
    const label = SCALE_LABELS[score];
    return label ? `${label} (${score}/${max})` : `${value}/${max}`;
  }

  if (type === 'choice') return String(value);
  return String(value);
}

export function summarizeCheckinAnswers(
  steps: CheckinStep[] | undefined,
  answers: Record<string, unknown> | undefined,
): string {
  if (!Array.isArray(steps) || !steps.length || !answers) return '—';

  const parts = steps
    .map((step) => {
      const value = answers[step.id];
      if (value == null || value === '') return null;
      return `${step.label || step.question}: ${formatCheckinAnswer(step, value)}`;
    })
    .filter(Boolean)
    .slice(0, 3);

  return parts.join(' · ') || '—';
}

export function buildAnswerRows(
  steps: CheckinStep[] | undefined,
  answers: Record<string, unknown> | undefined,
) {
  if (!Array.isArray(steps)) return [];
  return steps.map((step) => ({
    id: step.id,
    label: step.label || step.question || '',
    question: step.question,
    value: formatCheckinAnswer(step, answers?.[step.id]),
    raw: answers?.[step.id],
  }));
}

export function scoreFromTemplateAnswers(answers: Record<string, unknown> | null | undefined): number | null {
  if (!answers || typeof answers !== 'object') return null;
  const values: number[] = [];

  if (answers.food != null && Number.isFinite(Number(answers.food))) values.push(Number(answers.food));
  if (answers.sleep != null && Number.isFinite(Number(answers.sleep))) values.push(Number(answers.sleep));

  if (answers.water != null && Number.isFinite(Number(answers.water))) {
    const liters = Number(answers.water);
    if (liters <= 0.5) values.push(1);
    else if (liters <= 1) values.push(2);
    else if (liters <= 1.5) values.push(3);
    else if (liters <= 2) values.push(4);
    else values.push(5);
  }

  if (answers.exercise === true) values.push(5);
  if (answers.exercise === false) values.push(2);

  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / (values.length * 5)) * 100);
}

export function formatCheckinPeriod(periodKey: string | undefined, frequency?: string): string {
  if (!periodKey) return '—';

  if (frequency === 'daily') {
    return formatDateKeyPtBr(periodKey, { day: '2-digit', month: 'short', year: 'numeric' });
  }

  if (frequency === 'monthly') {
    const [year, month] = periodKey.split('-');
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
  }

  const startKey = String(periodKey).slice(0, 10);
  const endKey = addDaysToDateKey(startKey, 6);
  return `${formatDateKeyPtBr(startKey, { day: '2-digit', month: 'short' })} a ${formatDateKeyPtBr(endKey, { day: '2-digit', month: 'short' })}`;
}
