import {
  Apple,
  Brain,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MessageSquareText,
  Target,
} from 'lucide-vue-next'

export const ANAMNESE_GOAL_OPTIONS = [
  { id: 'emagrecimento', label: 'Emagrecimento', icon: 'scale' },
  { id: 'massa', label: 'Ganho de massa muscular', icon: 'dumbbell' },
  { id: 'saude', label: 'Saúde e bem-estar', icon: 'heart' },
  { id: 'performance', label: 'Performance esportiva', icon: 'zap' },
  { id: 'gestacao', label: 'Gestação / pós-parto', icon: 'baby' },
  { id: 'habitos', label: 'Reeducação alimentar', icon: 'utensils' },
]

export const ANAMNESE_STEPS = [
  {
    id: 'queixa',
    number: '01',
    label: 'Queixa principal',
    icon: MessageSquareText,
    fields: ['chiefComplaint', 'goals', 'goalPriority', 'symptomDuration', 'mainMotivation'],
  },
  {
    id: 'historico',
    number: '02',
    label: 'Histórico clínico',
    icon: ClipboardList,
    fields: ['diseases', 'medications', 'allergies', 'familyHistory'],
  },
  {
    id: 'habitos',
    number: '03',
    label: 'Hábitos e rotina',
    icon: Clock3,
    fields: ['sleep', 'water', 'exercise', 'dailyRoutine'],
  },
  {
    id: 'alimentacao',
    number: '04',
    label: 'Alimentação',
    icon: Apple,
    fields: ['mealRoutine', 'restrictions', 'cravings', 'supplements'],
  },
  {
    id: 'emocional',
    number: '05',
    label: 'Emocional',
    icon: Brain,
    fields: ['stress', 'relationshipWithFood', 'mood'],
  },
  {
    id: 'objetivos',
    number: '06',
    label: 'Objetivos e expectativas',
    icon: Target,
    fields: ['expectations', 'timeline', 'barriers'],
  },
  {
    id: 'resumo',
    number: '',
    label: 'Resumo',
    icon: CheckCircle2,
    fields: [],
  },
]

export function emptyAnamneseWizardForm() {
  return {
    chiefComplaint: '',
    goals: [],
    goalPriority: 0,
    symptomDuration: '',
    mainMotivation: '',
    diseases: '',
    medications: '',
    allergies: '',
    familyHistory: '',
    sleep: '',
    water: '',
    exercise: '',
    dailyRoutine: '',
    mealRoutine: '',
    restrictions: '',
    cravings: '',
    supplements: '',
    stress: '',
    relationshipWithFood: '',
    mood: '',
    expectations: '',
    timeline: '',
    barriers: '',
  }
}

function isFieldFilled(form, key) {
  const value = form?.[key]
  if (key === 'goals') return Array.isArray(value) && value.length > 0
  if (key === 'goalPriority') return typeof value === 'number' && value > 0
  return String(value || '').trim().length > 0
}

export function stepProgress(form, step) {
  const fields = step.fields || []
  if (!fields.length) return { filled: 0, total: 0, ratio: 1 }
  const filled = fields.filter((key) => isFieldFilled(form, key)).length
  return { filled, total: fields.length, ratio: filled / fields.length }
}

export function wizardProgress(form) {
  const contentSteps = ANAMNESE_STEPS.filter((step) => step.fields.length)
  let filled = 0
  let total = 0
  for (const step of contentSteps) {
    const progress = stepProgress(form, step)
    filled += progress.filled
    total += progress.total
  }
  return {
    filled,
    total,
    percent: total ? Math.round((filled / total) * 100) : 0,
    steps: contentSteps.map((step) => ({
      id: step.id,
      number: step.number,
      label: step.label,
      ...stepProgress(form, step),
    })),
  }
}

export function buildAnamneseContentFromWizard(form) {
  const goals = (form.goals || [])
    .map((id) => ANAMNESE_GOAL_OPTIONS.find((item) => item.id === id)?.label || id)
    .join(', ')

  const sections = [
    ['Queixa principal', form.chiefComplaint],
    ['Objetivos', goals],
    ['Prioridade do objetivo', `${form.goalPriority ?? '—'}/10`],
    ['Tempo dos sintomas', form.symptomDuration],
    ['Motivação principal', form.mainMotivation],
    ['Histórico clínico — doenças', form.diseases],
    ['Medicamentos', form.medications],
    ['Alergias / intolerâncias', form.allergies],
    ['Histórico familiar', form.familyHistory],
    ['Sono', form.sleep],
    ['Hidratação', form.water],
    ['Atividade física', form.exercise],
    ['Rotina diária', form.dailyRoutine],
    ['Rotina alimentar', form.mealRoutine],
    ['Restrições alimentares', form.restrictions],
    ['Compulsões / desejos', form.cravings],
    ['Suplementos', form.supplements],
    ['Estresse', form.stress],
    ['Relação com a comida', form.relationshipWithFood],
    ['Humor / emocional', form.mood],
    ['Expectativas', form.expectations],
    ['Prazo desejado', form.timeline],
    ['Barreiras percebidas', form.barriers],
  ]

  return sections
    .filter(([, value]) => String(value || '').trim())
    .map(([title, value]) => `<p><strong>${title}</strong></p><p>${escapeHtml(String(value)).replace(/\n/g, '<br>')}</p>`)
    .join('<p><br></p>')
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function htmlAnamneseToPlain(html) {
  const value = String(html || '')
  if (!value.trim()) return ''
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hydrateWizardFromAnamneseRecord(anamnese) {
  if (!anamnese || typeof anamnese !== 'object') return emptyAnamneseWizardForm()
  if (anamnese.formData) return normalizeWizardForm(anamnese.formData)
  const base = emptyAnamneseWizardForm()
  const plain = htmlAnamneseToPlain(anamnese.content)
  if (plain) base.chiefComplaint = plain.slice(0, 1000)
  return base
}

export function normalizeWizardForm(raw) {
  const base = emptyAnamneseWizardForm()
  if (!raw || typeof raw !== 'object') return base
  return {
    ...base,
    ...raw,
    goals: Array.isArray(raw.goals) ? [...raw.goals] : [],
    goalPriority: Number.isFinite(Number(raw.goalPriority)) ? Number(raw.goalPriority) : base.goalPriority,
  }
}
