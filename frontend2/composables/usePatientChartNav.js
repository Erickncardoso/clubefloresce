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
} from 'lucide-vue-next'
import { buildPatientChartTabLink } from '~/utils/patient-slug.js'

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
]

const LEGACY_TAB_MAP = {
  resumo: 'visao',
  checkins: 'evolucao',
  nutricao: 'evolucao',
  metas: 'evolucao',
  fotos: 'evolucao',
  diario: 'evolucao',
  plano: 'planos',
}

export const PATIENT_CHART_TABS = [
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

export const PATIENT_CHART_TAB_ICONS = {
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
]

export function normalizeChartTab(value) {
  const raw = String(value || 'visao')
  if (CHART_TAB_IDS.includes(raw)) return raw
  return LEGACY_TAB_MAP[raw] || 'visao'
}

export function patientChartBasePath(route) {
  const path = String(route?.path || '').replace(/\/$/, '')
  return path.replace(/\/documentos\/[^/]+$/, '')
}

export function getActiveChartTab(route, options = {}) {
  if (options.isDocumentEditor) return 'documentos'
  return normalizeChartTab(route?.query?.tab)
}

export function getActiveEvolucaoSub(route) {
  const sub = String(route?.query?.sub || '').trim()
  if (PATIENT_EVOLUCAO_SUBS.some((item) => item.id === sub)) return sub
  const tab = String(route?.query?.tab || '')
  if (['checkins', 'nutricao', 'metas', 'fotos', 'diario'].includes(tab)) return tab
  return 'checkins'
}

export function chartTabIcon(tabId) {
  return PATIENT_CHART_TAB_ICONS[tabId] || FileStack
}

export function buildChartTabLink(route, tabId, options = {}) {
  const path = patientChartBasePath(route)
  const query = { ...(options.query || route?.query || {}) }
  return buildPatientChartTabLink(path, tabId, {
    sub: options.sub ?? getActiveEvolucaoSub(route),
    query,
  })
}

export function usePatientChartNav() {
  const route = useRoute()

  const activeTab = computed(() => getActiveChartTab(route, {
    isDocumentEditor: /\/documentos\/[^/]+$/.test(String(route.path || '').replace(/\/$/, '')),
  }))

  const activeEvolucaoSub = computed(() => getActiveEvolucaoSub(route))

  function tabLink(tabId, options = {}) {
    return buildChartTabLink(route, tabId, options)
  }

  function evolucaoSubLink(subId) {
    return buildChartTabLink(route, 'evolucao', { sub: subId })
  }

  function isTabActive(tabId) {
    return activeTab.value === tabId
  }

  return {
    tabs: PATIENT_CHART_TABS,
    evolucaoSubs: PATIENT_EVOLUCAO_SUBS,
    activeTab,
    activeEvolucaoSub,
    tabLink,
    evolucaoSubLink,
    isTabActive,
    chartTabIcon,
  }
}
