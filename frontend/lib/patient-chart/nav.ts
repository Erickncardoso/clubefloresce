import {
  Baby,
  Brain,
  Calculator,
  CalendarClock,
  Camera,
  ClipboardPlus,
  FileStack,
  FolderOpen,
  Leaf,
  LineChart,
  NotebookPen,
  Pill,
  Salad,
  Scale,
  ScrollText,
  ShoppingBasket,
  Sparkles,
  Stethoscope,
  Syringe,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import CheckinIcon from '@/components/icons/CheckinIcon'

export type ChartTabIcon = LucideIcon | typeof CheckinIcon

export const CHART_TAB_IDS = [
  'farmaco_nutrientes',
  'acompanhamento',
  'avaliacao_integrada',
  'visao',
  'historico_consultas',
  'anamnese',
  'questionarios',
  'exames',
  'antropometria',
  'gestacional',
  'evolucao',
  'gastos',
  'planos',
  'suplementos',
  'prescricoes',
  'orientacoes',
  'arquivos',
  'prontuario',
  'atestados',
  'documentos',
  'pagamentos',
  'checkin',
] as const

export type ChartTabId = (typeof CHART_TAB_IDS)[number]

const LEGACY_TAB_MAP: Record<string, ChartTabId> = {
  resumo: 'visao',
  perfil: 'visao',
  checkins: 'checkin',
  nutricao: 'evolucao',
  metas: 'evolucao',
  fotos: 'evolucao',
  diario: 'evolucao',
  plano: 'planos',
  manipulados: 'prescricoes',
}

export type PatientChartTab = {
  id: ChartTabId
  label: string
  badge?: string
}

export const PATIENT_CHART_TABS: PatientChartTab[] = [
  { id: 'farmaco_nutrientes', label: 'Fármaco-nutrientes', badge: 'NOVO' },
  { id: 'acompanhamento', label: 'Acompanhamento' },
  { id: 'avaliacao_integrada', label: 'Avaliação integrada' },
  { id: 'visao', label: 'Perfil do paciente' },
  { id: 'historico_consultas', label: 'Histórico de consultas' },
  { id: 'anamnese', label: 'Anamnese geral' },
  { id: 'questionarios', label: 'Questionários de saúde' },
  { id: 'exames', label: 'Exames laboratoriais' },
  { id: 'antropometria', label: 'Antropometria geral' },
  { id: 'gestacional', label: 'Acompanhamento gestacional' },
  { id: 'evolucao', label: 'Evolução fotográfica' },
  { id: 'gastos', label: 'Cálculo energético' },
  { id: 'planos', label: 'Planejamento alimentar' },
  { id: 'suplementos', label: 'Suplementos e produtos' },
  { id: 'prescricoes', label: 'Prescrição de manipulados' },
  { id: 'orientacoes', label: 'Orientações nutricionais' },
  { id: 'arquivos', label: 'Arquivos anexos' },
  { id: 'prontuario', label: 'Prontuário do paciente' },
  { id: 'atestados', label: 'Atestados e receituários' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'pagamentos', label: 'Recibos e financeiro' },
  { id: 'checkin', label: 'Check-in' },
]

export const PATIENT_CHART_TAB_ICONS: Record<ChartTabId, ChartTabIcon> = {
  farmaco_nutrientes: Pill,
  acompanhamento: LineChart,
  avaliacao_integrada: Sparkles,
  visao: UserRound,
  historico_consultas: CalendarClock,
  anamnese: Stethoscope,
  questionarios: Brain,
  exames: Syringe,
  antropometria: Scale,
  gestacional: Baby,
  evolucao: Camera,
  gastos: Calculator,
  planos: Salad,
  suplementos: ShoppingBasket,
  prescricoes: Leaf,
  orientacoes: NotebookPen,
  arquivos: FolderOpen,
  prontuario: ClipboardPlus,
  atestados: ScrollText,
  documentos: FileStack,
  pagamentos: Wallet,
  checkin: CheckinIcon,
}

export const PATIENT_EVOLUCAO_SUBS = [
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

export function getActiveEvolucaoSub(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): EvolucaoSubId {
  const get = (key: string) => {
    if (searchParams instanceof URLSearchParams) return searchParams.get(key) || ''
    const v = searchParams[key]
    return Array.isArray(v) ? v[0] || '' : v || ''
  }
  const sub = String(get('sub') || '').trim()
  if (PATIENT_EVOLUCAO_SUBS.some((item) => item.id === sub)) return sub as EvolucaoSubId
  const tab = String(get('tab') || '')
  if (['nutricao', 'metas', 'fotos', 'diario'].includes(tab)) return tab as EvolucaoSubId
  return 'nutricao'
}

export function chartTabIcon(tabId: string): ChartTabIcon {
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
    params.set('sub', options.sub || 'nutricao')
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
