import { htmlToPlainText } from '~/utils/orientacao-templates.js'

export { htmlToPlainText }

export const DOCUMENTO_LIMIT = 5

export const DOCUMENTO_PREVIEW_MODELS = [
  { id: 'florescer', label: 'Modelo padrão' },
]

export const DOCUMENTO_TEMPLATES = [
  {
    id: 'blank',
    label: 'Em branco',
    category: 'Documento',
    title: 'Novo Documento',
    content: '',
  },
  {
    id: 'atestado',
    label: 'Atestado de comparecimento',
    category: 'Atestado',
    title: 'Novo Documento',
    content: [
      '<p>Atesto, para os devidos fins, que o(a) paciente acima identificado(a) compareceu a consulta nutricional nesta data, no período das __:__ às __:__ horas.</p>',
      '<p><br></p>',
      '<p>Por ser verdade, firmo o presente.</p>',
      '<p><br></p>',
      '<p>Cidade, ___ de __________ de 20__.</p>',
    ].join(''),
  },
  {
    id: 'declaracao-acompanhamento',
    label: 'Declaração de acompanhamento nutricional',
    category: 'Declaração',
    title: 'Novo Documento',
    content: [
      '<p>Declaro, para os devidos fins, que o(a) paciente acima identificado(a) encontra-se em acompanhamento nutricional neste consultório, com retorno programado para o dia ___/___/___.</p>',
      '<p><br></p>',
      '<p>O(A) paciente está em processo de adequação alimentar e nutricional, conforme plano individualizado. Informações adicionais podem ser fornecidas mediante solicitação formal.</p>',
      '<p><br></p>',
      '<p>Cidade, ___ de __________ de 20__.</p>',
    ].join(''),
  },
  {
    id: 'recibo',
    label: 'Recibo de consulta nutricional',
    category: 'Recibo',
    title: 'Novo Documento',
    content: [
      '<p>Recebi de ____________________________________________ a quantia de R$ __________ (___________________________________________), referente a consulta nutricional realizada em ___/___/___.</p>',
      '<p><br></p>',
      '<p>Para maior clareza, firmo o presente recibo.</p>',
      '<p><br></p>',
      '<p>Cidade, ___ de __________ de 20__.</p>',
    ].join(''),
  },
  {
    id: 'encaminhamento',
    label: 'Encaminhamento profissional',
    category: 'Encaminhamento',
    title: 'Novo Documento',
    content: [
      '<p>Encaminho o(a) paciente acima identificado(a) para avaliação com ________________________________, conforme necessidade clínica identificada em consulta nutricional.</p>',
      '<p><br></p>',
      '<p><strong>Motivo do encaminhamento</strong></p>',
      '<p><br></p>',
      '<p><strong>Observações clínicas relevantes</strong></p>',
      '<p><br></p>',
      '<p>Cidade, ___ de __________ de 20__.</p>',
    ].join(''),
  },
  {
    id: 'termo-consentimento',
    label: 'Termo de Consentimento Livre e Esclarecido',
    category: 'Termo de Consentimento',
    title: 'Novo Documento',
    content: [
      '<p>Eu, paciente acima identificado(a), declaro ter sido informado(a) sobre a natureza, objetivos, benefícios, riscos e alternativas do acompanhamento nutricional proposto, bem como sobre o sigilo das informações compartilhadas.</p>',
      '<p><br></p>',
      '<p>Declaro que tive oportunidade de esclarecer dúvidas e que consinto, de forma livre e esclarecida, com a condução do plano nutricional.</p>',
      '<p><br></p>',
      '<p>Local e data: _____________________________</p>',
      '<p><br></p>',
      '<p>Assinatura do paciente: _____________________________</p>',
    ].join(''),
  },
  {
    id: 'declaracao-restricao',
    label: 'Declaração de restrição alimentar',
    category: 'Declaração',
    title: 'Novo Documento',
    content: [
      '<p>Declaro, para os devidos fins, que o(a) paciente acima identificado(a) apresenta restrição alimentar/alergia/intolerância a:</p>',
      '<p><br></p>',
      '<p>_____________________________________________</p>',
      '<p><br></p>',
      '<p>Recomenda-se observância rigorosa nas orientações de preparo, manipulação e oferta de alimentos.</p>',
      '<p><br></p>',
      '<p>Cidade, ___ de __________ de 20__.</p>',
    ].join(''),
  },
]

export function findDocumentoTemplate(id) {
  const normalized = id === 'declaracao' ? 'declaracao-acompanhamento' : id
  const custom = loadCustomDocumentoTemplates().find((item) => item.id === normalized)
  if (custom) return custom
  return DOCUMENTO_TEMPLATES.find((item) => item.id === normalized) || DOCUMENTO_TEMPLATES[0]
}

export function documentoPreviewText(item) {
  const value = htmlToPlainText(item?.content)
  if (!value) return 'Sem conteúdo ainda.'
  return value.length > 140 ? `${value.slice(0, 140)}…` : value
}

export function documentoStatusLabel(status) {
  if (status === 'published') return 'Publicado'
  return 'Rascunho'
}

export const DOCUMENTO_LOGO_SRC = '/icons/logovetorcarregamento.svg'

const CUSTOM_TEMPLATES_KEY = 'cf-documento-custom-templates'

export function loadCustomDocumentoTemplates() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY)
    const parsed = JSON.parse(raw || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item?.id && item?.label)
      .map((item) => ({
        id: String(item.id),
        label: String(item.label).slice(0, 80),
        category: String(item.category || 'Meus modelos').slice(0, 60),
        title: String(item.title || item.label).slice(0, 160),
        content: String(item.content || ''),
        custom: true,
      }))
  } catch {
    return []
  }
}

export function saveCustomDocumentoTemplate({ label, title, content, category = 'Meus modelos' }) {
  const trimmedLabel = String(label || title || 'Meu modelo').trim()
  if (!trimmedLabel) throw new Error('Informe um nome para o modelo.')
  const templates = loadCustomDocumentoTemplates()
  const item = {
    id: `custom-${crypto.randomUUID()}`,
    label: trimmedLabel.slice(0, 80),
    category: String(category || 'Meus modelos').slice(0, 60),
    title: String(title || trimmedLabel).slice(0, 160),
    content: String(content || ''),
    custom: true,
    createdAt: new Date().toISOString(),
  }
  templates.unshift(item)
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates.slice(0, 20)))
  return item
}

export function removeCustomDocumentoTemplate(id) {
  const templates = loadCustomDocumentoTemplates().filter((item) => item.id !== id)
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates))
}

export function getAllDocumentoTemplates() {
  return [...DOCUMENTO_TEMPLATES, ...loadCustomDocumentoTemplates()]
}

export function findDocumentoTemplateInAll(id) {
  return getAllDocumentoTemplates().find((item) => item.id === id) || findDocumentoTemplate(id)
}
