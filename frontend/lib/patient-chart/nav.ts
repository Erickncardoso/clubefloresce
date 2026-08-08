import {
  Activity,
  FileStack,
  FlaskConical,
  HeartPulse,
  Leaf,
  ListChecks,
  NotebookPen,
  Paperclip,
  Salad,
  Scale,
  ScrollText,
  Sparkles,
  Stethoscope,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export const CHART_TAB_IDS = [
  'visao',
  'planos',
  'anamnese',
  'orientacoes',
  'documentos',
  'antropometria',
  'gastos',
  'exames',
  'prescricoes',
  'pagamentos',
  'arquivos',
  'questionarios',
  'evolucao',
] as const

export type ChartTabId = (typeof CHART_TAB_IDS)[number]

const LEGACY_TAB_MAP: Record<string, ChartTabId> = {
  resumo: 'visao',
  checkins: 'evolucao',
  nutricao: 'evolucao',
  metas: 'evolucao',
  fotos: 'evolucao',
  diario: 'evolucao',
  plano: 'planos',
}

export const PATIENT_CHART_TABS: Array<{ id: ChartTabId; label: string }> = [
  { id: 'visao', label: 'Visão Geral' },
  { id: 'planos', label: 'Planos Alimentares' },
  { id: 'anamnese', label: 'Anamnese' },
  { id: 'orientacoes', label: 'Orientações' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'antropometria', label: 'Avaliações Antropométricas' },
  { id: 'gastos', label: 'Gastos Energéticos' },
  { id: 'exames', label: 'Exames' },
  { id: 'prescricoes', label: 'Prescrições' },
  { id: 'pagamentos', label: 'Pagamentos' },
  { id: 'arquivos', label: 'Arquivos' },
  { id: 'questionarios', label: 'Questionários' },
  { id: 'evolucao', label: 'Evolução' },
]

export const PATIENT_CHART_TAB_ICONS: Record<ChartTabId, LucideIcon> = {
  visao: Sparkles,
  planos: Salad,
  anamnese: Stethoscope,
  orientacoes: NotebookPen,
  documentos: ScrollText,
  antropometria: Scale,
  gastos: HeartPulse,
  exames: FlaskConical,
  prescricoes: Leaf,
  pagamentos: Wallet,
  arquivos: Paperclip,
  questionarios: ListChecks,
  evolucao: Activity,
}

export const PATIENT_EVOLUCAO_SUBS = [
  { id: 'checkins', label: 'Check-ins' },
  { id: 'nutricao', label: 'Nutrição' },
  { id: 'metas', label: 'Metas' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'diario', label: 'Diário' },
] as const

export type EvolucaoSubId = (typeof PATIENT_EVOLUCAO_SUBS)[number]['id']

export function normalizeChartTab(value?: string | null): ChartTabId {
  const raw = String(value || 'visao')
  if ((CHART_TAB_IDS as readonly string[]).includes(raw)) return raw as ChartTabId
  return LEGACY_TAB_MAP[raw] || 'visao'
}

export function getActiveEvolucaoSub(searchParams: URLSearchParams | Record<string, string | string[] | undefined>): EvolucaoSubId {
  const get = (key: string) => {
    if (searchParams instanceof URLSearchParams) return searchParams.get(key) || ''
    const v = searchParams[key]
    return Array.isArray(v) ? v[0] || '' : v || ''
  }
  const sub = String(get('sub') || '').trim()
  if (PATIENT_EVOLUCAO_SUBS.some((item) => item.id === sub)) return sub as EvolucaoSubId
  const tab = String(get('tab') || '')
  if (['checkins', 'nutricao', 'metas', 'fotos', 'diario'].includes(tab)) return tab as EvolucaoSubId
  return 'checkins'
}

export function chartTabIcon(tabId: string): LucideIcon {
  return PATIENT_CHART_TAB_ICONS[tabId as ChartTabId] || FileStack
}

export function buildChartTabHref(
  patientId: string,
  tabId: string,
  options: { sub?: string; basePath?: string } = {},
) {
  const tab = normalizeChartTab(tabId)
  const params = new URLSearchParams()
  params.set('tab', tab)
  if (tab === 'evolucao') {
    params.set('sub', options.sub || 'checkins')
  }
  const base = options.basePath || `/pacientes/${encodeURIComponent(patientId)}`
  return `${base}?${params.toString()}`
}

export function isPatientFullPageEditor(pathname: string) {
  return /\/pacientes\/[^/]+\/(documentos|planos)\/[^/]+\/?$/.test(pathname)
}

export function isPatientChartPath(pathname: string) {
  return /^\/pacientes\//.test(pathname)
}
