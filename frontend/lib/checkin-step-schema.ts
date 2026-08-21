/** Tipos de pergunta do check-in typeform — editor, fluxo e API. */

export const CHECKIN_STEP_TYPE_OPTIONS = [
  { value: 'choice', label: 'Escolha única (opções personalizadas)' },
  { value: 'text', label: 'Texto livre' },
  { value: 'scale', label: 'Escala com estrelas' },
  { value: 'number', label: 'Número (com +/−)' },
  { value: 'exercise', label: 'Sim / Não (textos personalizados)' },
  { value: 'food', label: 'Alimentação (rostos emoji)' },
  { value: 'water', label: 'Água (litros)' },
] as const

export type CheckinStepType = (typeof CHECKIN_STEP_TYPE_OPTIONS)[number]['value']

export type EditorStep = {
  _key: string
  id: string
  type: CheckinStepType | string
  question: string
  hint: string
  optionsText: string
  scaleMin: number
  scaleMax: number
  waterMin: number
  waterMax: number
  waterStep: number
  waterDefault: number
  numberMin: number
  numberMax: number
  numberStep: number
  numberDefault: number
  numberUnit: string
  yesLabel: string
  noLabel: string
  placeholder: string
}

export type StepApiPayload = {
  id: string
  type: string
  label: string
  question: string
  hint: string
  min?: number
  max?: number
  step?: number
  defaultValue?: number
  unit?: string
  options?: string[]
  yesLabel?: string
  noLabel?: string
  placeholder?: string
}

function newKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `k_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function defaultEditorStep(): EditorStep {
  return {
    _key: newKey(),
    id: `step_${Date.now()}`,
    type: 'choice',
    question: '',
    hint: '',
    optionsText: 'Sim\nNão',
    scaleMin: 1,
    scaleMax: 5,
    waterMin: 0,
    waterMax: 5,
    waterStep: 0.25,
    waterDefault: 2,
    numberMin: 0,
    numberMax: 10,
    numberStep: 1,
    numberDefault: 0,
    numberUnit: '',
    yesLabel: 'Sim',
    noLabel: 'Não',
    placeholder: 'Sua resposta...',
  }
}

function parseOptionsText(optionsText: string) {
  return String(optionsText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function clampFloat(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function editorStepFromApi(step: StepApiPayload | Record<string, unknown>): EditorStep {
  const options = Array.isArray(step.options)
    ? step.options.map((o) =>
        typeof o === 'string' ? o : String((o as { label?: string; value?: string }).label || (o as { value?: string }).value || ''),
      )
    : []

  return {
    _key: newKey(),
    id: String(step.id || `step_${Date.now()}`),
    type: String(step.type || 'text'),
    question: String(step.question || ''),
    hint: String(step.hint || ''),
    optionsText: options.join('\n'),
    scaleMin: step.min != null ? Number(step.min) : 1,
    scaleMax: step.max != null ? Number(step.max) : 5,
    waterMin: step.min != null ? Number(step.min) : 0,
    waterMax: step.max != null ? Number(step.max) : 5,
    waterStep: step.step != null ? Number(step.step) : 0.25,
    waterDefault: step.defaultValue != null ? Number(step.defaultValue) : 2,
    numberMin: step.min != null ? Number(step.min) : 0,
    numberMax: step.max != null ? Number(step.max) : 10,
    numberStep: step.step != null ? Number(step.step) : 1,
    numberDefault: step.defaultValue != null ? Number(step.defaultValue) : 0,
    numberUnit: String(step.unit || ''),
    yesLabel: String(step.yesLabel || 'Sim'),
    noLabel: String(step.noLabel || 'Não'),
    placeholder: String(step.placeholder || 'Sua resposta...'),
  }
}

export function buildStepPayload(step: EditorStep, index: number): StepApiPayload {
  const question = String(step.question || '').trim()
  const payload: StepApiPayload = {
    id: String(step.id || `step_${index + 1}`).trim(),
    type: step.type,
    label: question.slice(0, 80),
    question,
    hint: step.hint ? String(step.hint).trim() : '',
  }

  if (!payload.question) {
    throw new Error(`Pergunta ${index + 1}: texto obrigatório.`)
  }

  if (payload.type === 'scale') {
    const min = clampInt(step.scaleMin, 1, 0, 20)
    let max = clampInt(step.scaleMax, 5, 1, 20)
    if (max < min) max = min
    payload.min = min
    payload.max = max
  }

  if (payload.type === 'choice') {
    const options = parseOptionsText(step.optionsText)
    if (options.length < 2) {
      throw new Error(`Pergunta ${index + 1}: adicione pelo menos 2 opções.`)
    }
    payload.options = options
  }

  if (payload.type === 'water') {
    const min = clampFloat(step.waterMin, 0, 0, 50)
    let max = clampFloat(step.waterMax, 5, 0.25, 50)
    if (max < min) max = min
    const waterStep = clampFloat(step.waterStep, 0.25, 0.05, max)
    payload.min = min
    payload.max = max
    payload.step = waterStep
    payload.defaultValue = clampFloat(step.waterDefault, 2, min, max)
    payload.unit = 'litros'
  }

  if (payload.type === 'number') {
    const min = clampFloat(step.numberMin, 0, -1000, 10000)
    let max = clampFloat(step.numberMax, 10, -1000, 10000)
    if (max < min) max = min
    const numStep = clampFloat(step.numberStep, 1, 0.01, max - min || 1)
    payload.min = min
    payload.max = max
    payload.step = numStep
    payload.defaultValue = clampFloat(step.numberDefault, min, min, max)
    payload.unit = String(step.numberUnit || '').trim()
  }

  if (payload.type === 'exercise') {
    payload.yesLabel = String(step.yesLabel || 'Sim').trim() || 'Sim'
    payload.noLabel = String(step.noLabel || 'Não').trim() || 'Não'
  }

  if (payload.type === 'text') {
    payload.placeholder = String(step.placeholder || 'Sua resposta...').trim() || 'Sua resposta...'
  }

  return payload
}

export function buildStepPreviewPayload(step: EditorStep, index: number): StepApiPayload {
  const draft = { ...step }
  if (!String(draft.question || '').trim()) {
    draft.question = 'Sua pergunta aparecerá aqui'
  }
  if (draft.type === 'choice' && parseOptionsText(draft.optionsText).length < 2) {
    draft.optionsText = 'Sim\nNão'
  }
  try {
    return buildStepPayload(draft, index)
  } catch {
    return {
      id: String(draft.id || `step_${index + 1}`).trim(),
      type: draft.type || 'text',
      label: String(draft.question || `Pergunta ${index + 1}`)
        .trim()
        .slice(0, 80),
      question: String(draft.question).trim(),
      hint: draft.hint ? String(draft.hint).trim() : '',
      options: ['Sim', 'Não'],
    }
  }
}

export function stepTypeLabel(type: string) {
  return CHECKIN_STEP_TYPE_OPTIONS.find((o) => o.value === type)?.label || type
}

export type FlowStep = {
  id: string
  type: string
  label: string
  question: string
  hint: string
  min?: number
  max?: number
  step?: number
  defaultValue?: number
  unit: string
  yesLabel: string
  noLabel: string
  placeholder: string
  options?: unknown
}

export function normalizeFlowStep(
  step: Partial<StepApiPayload> & Record<string, unknown>,
  index: number,
): FlowStep {
  const type = String(step.type || step.id || 'text')
  const base: FlowStep = {
    id: String(step.id || `step_${index + 1}`),
    type,
    label: String(step.label || step.question || `Pergunta ${index + 1}`),
    question: String(step.question || step.label || `Pergunta ${index + 1}`),
    hint: String(step.hint || ''),
    min: step.min != null ? Number(step.min) : undefined,
    max: step.max != null ? Number(step.max) : undefined,
    step: step.step != null ? Number(step.step) : undefined,
    defaultValue: step.defaultValue != null ? Number(step.defaultValue) : undefined,
    unit: step.unit ? String(step.unit) : '',
    yesLabel: step.yesLabel ? String(step.yesLabel) : 'Sim',
    noLabel: step.noLabel ? String(step.noLabel) : 'Não',
    placeholder: step.placeholder ? String(step.placeholder) : 'Sua resposta...',
    options: step.options,
  }

  if (type === 'scale') {
    base.min = base.min ?? 1
    base.max = base.max ?? 5
  }
  if (type === 'water') {
    base.min = base.min ?? 0
    base.max = base.max ?? 5
    base.step = base.step ?? 0.25
    base.defaultValue = base.defaultValue ?? 2
    base.unit = base.unit || 'litros'
  }
  if (type === 'number') {
    base.min = base.min ?? 0
    base.max = base.max ?? 10
    base.step = base.step ?? 1
    base.defaultValue = base.defaultValue ?? base.min ?? 0
  }

  return base
}
