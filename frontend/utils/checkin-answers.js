const FOOD_LABELS = {
  1: 'Muito ruim',
  2: 'Ruim',
  3: 'Regular',
  4: 'Boa',
  5: 'Excelente',
}

const SCALE_LABELS = {
  1: 'Péssimo',
  2: 'Ruim',
  3: 'Regular',
  4: 'Bom',
  5: 'Excelente',
}

export function formatCheckinAnswer(step, value) {
  if (value == null || value === '') return '—'

  const type = step?.type || 'text'
  const id = step?.id

  if (type === 'food') {
    return FOOD_LABELS[Number(value)] || String(value)
  }

  if (type === 'water') {
    const glasses = Number(value)
    if (!Number.isFinite(glasses)) return String(value)
    return glasses === 1 ? '1 copo' : `${glasses} copos`
  }

  if (type === 'exercise') {
    return value === true || value === 'true' ? 'Sim, praticou' : 'Não praticou'
  }

  if (type === 'scale') {
    const score = Number(value)
    const label = SCALE_LABELS[score]
    return label ? `${label} (${score}/5)` : `${value}/5`
  }

  if (type === 'choice') {
    return String(value)
  }

  if (id === 'sleep') {
    const score = Number(value)
    const label = SCALE_LABELS[score]
    return label ? `${label} (${score}/5)` : `${value}/5`
  }

  return String(value)
}

export function summarizeCheckinAnswers(steps, answers) {
  if (!Array.isArray(steps) || !steps.length || !answers) return '—'

  const parts = steps
    .map((step) => {
      const value = answers[step.id]
      if (value == null || value === '') return null
      return `${step.label || step.question}: ${formatCheckinAnswer(step, value)}`
    })
    .filter(Boolean)
    .slice(0, 3)

  return parts.join(' · ') || '—'
}

export function buildAnswerRows(steps, answers) {
  if (!Array.isArray(steps)) return []

  return steps.map((step) => ({
    id: step.id,
    label: step.label || step.question,
    question: step.question,
    value: formatCheckinAnswer(step, answers?.[step.id]),
    raw: answers?.[step.id],
  }))
}

export function scoreFromTemplateAnswers(answers) {
  if (!answers || typeof answers !== 'object') return null

  const values = []

  if (answers.food != null && Number.isFinite(Number(answers.food))) {
    values.push(Number(answers.food))
  }

  if (answers.sleep != null && Number.isFinite(Number(answers.sleep))) {
    values.push(Number(answers.sleep))
  }

  if (answers.water != null && Number.isFinite(Number(answers.water))) {
    const glasses = Number(answers.water)
    if (glasses <= 2) values.push(1)
    else if (glasses <= 4) values.push(2)
    else if (glasses <= 6) values.push(3)
    else if (glasses <= 8) values.push(4)
    else values.push(5)
  }

  if (answers.exercise === true) values.push(5)
  if (answers.exercise === false) values.push(2)

  if (!values.length) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / (values.length * 5)) * 100)
}

export function formatCheckinPeriod(periodKey, frequency) {
  if (!periodKey) return '—'

  if (frequency === 'daily') {
    const [year, month, day] = periodKey.slice(0, 10).split('-')
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  if (frequency === 'monthly') {
    const [year, month] = periodKey.split('-')
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    })
  }

  const start = new Date(periodKey)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  return `${fmt(start)} a ${fmt(end)}`
}
