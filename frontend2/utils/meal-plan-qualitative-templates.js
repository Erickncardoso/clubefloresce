import { htmlToQualitativeText, qualitativeContentPreview } from './meal-plan-qualitative-html.js'

export const QUALITATIVE_TEMPLATE_LIMIT = 40

export const QUALITATIVE_BUILTIN_TEMPLATES = [
  {
    id: 'builtin-comportamental',
    title: 'Plano comportamental',
    editorHtml: [
      '<p><strong>Princípios gerais</strong></p>',
      '<ul>',
      '<li>Coma com atenção, sem telas, em ambiente calmo</li>',
      '<li>Respeite a fome e a saciedade — pare quando estiver confortável</li>',
      '<li>Priorize alimentos in natura e minimamente processados</li>',
      '</ul>',
      '<p><br></p>',
      '<p><strong>Café da manhã</strong></p>',
      '<p>Combine proteína + fibra + fruta. Ex.: iogurte natural com aveia e banana.</p>',
      '<p><br></p>',
      '<p><strong>Almoço e jantar</strong></p>',
      '<p>Metade do prato: vegetais · ¼ proteína magra · ¼ carboidrato integral.</p>',
      '<p><br></p>',
      '<p><strong>Lanches</strong></p>',
      '<p>Fruta, castanhas ou iogurte — evite longos intervalos sem comer.</p>',
      '<p><br></p>',
      '<p><strong>Hidratação</strong></p>',
      '<p>Manter água ao longo do dia; reduzir líquidos calóricos.</p>',
    ].join(''),
    finalNotes: 'Ajuste as orientações conforme a rotina e preferências da paciente.',
    builtin: true,
  },
  {
    id: 'builtin-low-carb-leve',
    title: 'Low carb leve',
    editorHtml: [
      '<p><strong>08:00 — Café da manhã</strong></p>',
      '<ul>',
      '<li>2 ovos mexidos ou cozidos</li>',
      '<li>1 fatia de pão integral ou 2 col. de aveia</li>',
      '<li>Fruta pequena ou ½ porção</li>',
      '</ul>',
      '<p><br></p>',
      '<p><strong>12:30 — Almoço</strong></p>',
      '<ul>',
      '<li>Proteína magra (120–150 g)</li>',
      '<li>Salada ou legumes à vontade</li>',
      '<li>Arroz integral ou batata-doce em porção moderada</li>',
      '</ul>',
      '<p><br></p>',
      '<p><strong>16:00 — Lanche</strong></p>',
      '<p>Iogurte natural + castanhas ou queijo branco + tomate</p>',
      '<p><br></p>',
      '<p><strong>19:30 — Jantar</strong></p>',
      '<ul>',
      '<li>Repetir estrutura do almoço com porções menores</li>',
      '<li>Evitar carboidratos refinados à noite, se possível</li>',
      '</ul>',
    ].join(''),
    finalNotes: '',
    builtin: true,
  },
  {
    id: 'builtin-estruturado',
    title: 'Cardápio com horários',
    editorHtml: [
      '<p>08:30 - Café da Manhã / Opção 1</p>',
      '<p>Banana - 1 un</p>',
      '<p>Aveia - 5 col. (sopa)</p>',
      '<p>Iogurte natural - 170 g</p>',
      '<p><br></p>',
      '<p>12:30 - Almoço</p>',
      '<p>Arroz integral - 4 col. (sopa)</p>',
      '<p>Feijão - 1 concha</p>',
      '<p>Frango grelhado - 120 g</p>',
      '<p>Salada verde - à vontade</p>',
      '<p><br></p>',
      '<p>!- Whey protein - 1 scoop</p>',
      '<p>#- Beber 2 L de água ao longo do dia</p>',
    ].join(''),
    finalNotes: 'Use ! para suplementos, @ para grupos, $ para receitas e # para observações.',
    builtin: true,
  },
]

export function normalizeQualitativeTemplate(raw) {
  if (!raw || typeof raw !== 'object') return null
  const title = String(raw.title || '').trim()
  if (!title) return null
  const editorHtml = String(raw.editorHtml || raw.content || '').trim()
  const editorText = String(raw.editorText || htmlToQualitativeText(editorHtml)).trim()
  if (!editorHtml && !editorText) return null
  return {
    id: String(raw.id || '').trim() || crypto.randomUUID(),
    title,
    editorHtml: editorHtml || '',
    editorText,
    finalNotes: String(raw.finalNotes || '').trim(),
    builtin: raw.builtin === true,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  }
}

export function filterQualitativeTemplates(query, templates = []) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return templates
  return templates.filter((item) => {
    const haystack = [
      item.title,
      item.editorText,
      htmlToQualitativeText(item.editorHtml),
      item.finalNotes,
    ].join(' ').toLowerCase()
    return haystack.includes(q)
  })
}

export function mergeQualitativeTemplates(saved = []) {
  const normalizedSaved = (Array.isArray(saved) ? saved : [])
    .map(normalizeQualitativeTemplate)
    .filter(Boolean)
  const builtin = QUALITATIVE_BUILTIN_TEMPLATES.map(normalizeQualitativeTemplate).filter(Boolean)
  const savedIds = new Set(normalizedSaved.map((item) => item.id))
  const merged = [
    ...normalizedSaved,
    ...builtin.filter((item) => !savedIds.has(item.id)),
  ]
  return merged.sort((a, b) => {
    if (a.builtin !== b.builtin) return a.builtin ? 1 : -1
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  })
}

export function previewQualitativeTemplate(item) {
  return qualitativeContentPreview({
    editorHtml: item?.editorHtml,
    editorText: item?.editorText,
  })
}

export function applyQualitativeTemplate(form, template, { mode = 'replace' } = {}) {
  const next = normalizeQualitativeTemplate(template)
  if (!next) return form
  if (mode === 'append') {
    const currentHtml = String(form.editorHtml || '').trim()
    const block = currentHtml
      ? `${currentHtml}<p><br></p>${next.editorHtml}`
      : next.editorHtml
    form.editorHtml = block
    form.editorText = htmlToQualitativeText(block)
  } else {
    form.editorHtml = next.editorHtml
    form.editorText = next.editorText || htmlToQualitativeText(next.editorHtml)
  }
  if (next.finalNotes && !String(form.finalNotes || '').trim()) {
    form.finalNotes = next.finalNotes
  }
  return form
}
