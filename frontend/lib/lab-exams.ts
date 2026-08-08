// TypeScript port of frontend/utils/lab-exams.js + lab-exam-comparison.js

import type { Exame, BiomarkerRow } from './types'

// ── Catalog ────────────────────────────────────────────────────────────────────

export const EXAMES_LIMIT = 30

export type BiomarkerCatalogEntry = {
  id: string
  name: string
  unit: string
  category: string
  defaultRefMin: number | null
  defaultRefMax: number | null
  insightShort: string
  insightExtended: string
  references: string[]
}

export const BIOMARKER_CATEGORIES: { id: string; label: string }[] = [
  { id: 'glycemic', label: 'Metabolismo glicêmico' },
  { id: 'lipid', label: 'Perfil lipídico' },
  { id: 'thyroid', label: 'Tireoide' },
  { id: 'hematology', label: 'Hematologia e ferro' },
  { id: 'renal', label: 'Função renal' },
  { id: 'hepatic', label: 'Função hepática' },
  { id: 'vitamins', label: 'Vitaminas e minerais' },
  { id: 'inflammation', label: 'Inflamação' },
]

export const LAB_BIOMARKER_CATALOG: BiomarkerCatalogEntry[] = [
  {
    id: 'glucose_fasting', name: 'Glicemia de jejum', unit: 'mg/dL', category: 'glycemic',
    defaultRefMin: 70, defaultRefMax: 99,
    insightShort: 'Reflete a glicemia basal e sensibilidade à insulina.',
    insightExtended: 'Valores persistentemente elevados sugerem resistência insulínica ou diabetes (MS/SBD). Valores baixos podem indicar hipoglicemia reativa ou jejum prolongado. Contextualize com HbA1c, insulina e padrão alimentar (DRI/OMS).',
    references: ['MS', 'SBD', 'DRI', 'OMS'],
  },
  {
    id: 'hba1c', name: 'HbA1c', unit: '%', category: 'glycemic',
    defaultRefMin: 4, defaultRefMax: 5.6,
    insightShort: 'Média glicêmica dos últimos ~3 meses.',
    insightExtended: '≥5,7% indica pré-diabetes; ≥6,5% confirma diabetes (SBD/ADA). Queda progressiva reflete adesão nutricional e controle glicêmico. Metas individualizadas conforme idade e comorbidades.',
    references: ['SBD', 'ADA', 'OMS'],
  },
  {
    id: 'insulin_fasting', name: 'Insulina de jejum', unit: 'µUI/mL', category: 'glycemic',
    defaultRefMin: 2, defaultRefMax: 12,
    insightShort: 'Marcador de resistência insulínica quando elevada.',
    insightExtended: 'Insulina alta com glicemia normal sugere hiperinsulinemia compensatória. Útil para ajustar distribuição de carboidratos e estratégias de perda de peso.',
    references: ['Endocrine Society', 'DRI'],
  },
  {
    id: 'total_cholesterol', name: 'Colesterol total', unit: 'mg/dL', category: 'lipid',
    defaultRefMin: null, defaultRefMax: 190,
    insightShort: 'Visão global do metabolismo lipídico.',
    insightExtended: 'Interpretar junto com LDL, HDL e triglicerídeos (SBC). Dieta rica em gorduras saturadas, ultraprocessados e baixa fibra tende a elevar CT.',
    references: ['SBC', 'DRI'],
  },
  {
    id: 'hdl', name: 'HDL-colesterol', unit: 'mg/dL', category: 'lipid',
    defaultRefMin: 40, defaultRefMax: null,
    insightShort: 'Quanto maior, em geral, melhor proteção cardiovascular.',
    insightExtended: 'HDL baixo associa-se a sedentarismo, excesso de carboidratos refinados e tabagismo. Atividade física e gorduras monoinsaturadas podem elevar HDL (SBC).',
    references: ['SBC', 'OMS'],
  },
  {
    id: 'ldl', name: 'LDL-colesterol', unit: 'mg/dL', category: 'lipid',
    defaultRefMin: null, defaultRefMax: 130,
    insightShort: 'Principal alvo lipídico na prevenção cardiovascular.',
    insightExtended: 'Metas variam conforme risco cardiovascular (SBC). Fibra solúvel, Ômega-3, redução de gordura trans/saturada e perda de peso ajudam a reduzir LDL.',
    references: ['SBC', 'DRI'],
  },
  {
    id: 'triglycerides', name: 'Triglicerídeos', unit: 'mg/dL', category: 'lipid',
    defaultRefMin: null, defaultRefMax: 150,
    insightShort: 'Sensível à ingestão de açúcares, álcool e excesso calórico.',
    insightExtended: 'TG elevados frequentemente respondem a redução de carboidratos simples, álcool e perda de peso. Valores muito altos (>500) exigem atenção clínica imediata (SBC).',
    references: ['SBC', 'OMS'],
  },
  {
    id: 'tsh', name: 'TSH', unit: 'µUI/mL', category: 'thyroid',
    defaultRefMin: 0.4, defaultRefMax: 4.0,
    insightShort: 'Screening de disfunção tireoidiana.',
    insightExtended: 'TSH alto sugere hipotireoidismo; TSH baixo, hipertireoidismo (SBEM). Alterações impactam metabolismo basal, peso, lipídios e termogênese.',
    references: ['SBEM', 'OMS'],
  },
  {
    id: 'free_t4', name: 'T4 livre', unit: 'ng/dL', category: 'thyroid',
    defaultRefMin: 0.8, defaultRefMax: 1.8,
    insightShort: 'Confirma função tireoidiana junto ao TSH.',
    insightExtended: 'Interpretar sempre com TSH. Hipotireoidismo subclínico pode exigir acompanhamento nutricional para controle de peso e constipação.',
    references: ['SBEM'],
  },
  {
    id: 'hemoglobin', name: 'Hemoglobina', unit: 'g/dL', category: 'hematology',
    defaultRefMin: 12, defaultRefMax: 16,
    insightShort: 'Capacidade de transporte de oxigênio.',
    insightExtended: 'Valores baixos sugerem anemia — investigar ferro, B12, folato e perdas (MS). Nutrição: ferro heme, vitamina C, evitar chá/café nas refeições ricas em ferro.',
    references: ['MS', 'DRI'],
  },
  {
    id: 'ferritin', name: 'Ferritina', unit: 'ng/mL', category: 'hematology',
    defaultRefMin: 15, defaultRefMax: 150,
    insightShort: 'Reservas de ferro; também marcador inflamatório.',
    insightExtended: 'Ferritina baixa confirma depleção de ferro. Elevada pode ser inflamação, sobrecarga ou doença hepática. Contextualize com PCR-us e quadro clínico.',
    references: ['MS', 'DRI'],
  },
  {
    id: 'vitamin_b12', name: 'Vitamina B12', unit: 'pg/mL', category: 'hematology',
    defaultRefMin: 200, defaultRefMax: 900,
    insightShort: 'Essencial para eritropoiese e função neurológica.',
    insightExtended: 'Deficiência comum em vegetarianos/veganos, idosos e uso de metformina. Suplementação e alimentos fortificados conforme DRI.',
    references: ['DRI', 'OMS'],
  },
  {
    id: 'creatinine', name: 'Creatinina', unit: 'mg/dL', category: 'renal',
    defaultRefMin: 0.6, defaultRefMax: 1.2,
    insightShort: 'Estimativa de função renal.',
    insightExtended: 'Elevação pode refletir desidratação, massa muscular alta ou disfunção renal. Ajuste proteína e sódio conforme estágio da DRC (MS/SBN).',
    references: ['MS', 'SBN'],
  },
  {
    id: 'urea', name: 'Ureia', unit: 'mg/dL', category: 'renal',
    defaultRefMin: 15, defaultRefMax: 45,
    insightShort: 'Metabolismo proteico e função renal.',
    insightExtended: 'Pode elevar com dieta hiperproteica, desidratação ou insuficiência renal. Interpretar com creatinina e ingestão proteica.',
    references: ['MS'],
  },
  {
    id: 'alt', name: 'ALT (TGP)', unit: 'U/L', category: 'hepatic',
    defaultRefMin: null, defaultRefMax: 40,
    insightShort: 'Enzima hepática — esteatose e inflamação.',
    insightExtended: 'Elevação leve a moderada comum em esteatose metabólica (NAFLD). Perda de peso, redução de fructose/álcool e atividade física melhoram perfil hepático.',
    references: ['MS', 'AASLD'],
  },
  {
    id: 'ast', name: 'AST (TGO)', unit: 'U/L', category: 'hepatic',
    defaultRefMin: null, defaultRefMax: 40,
    insightShort: 'Enzima hepática e muscular.',
    insightExtended: 'Elevação isolada pode ser muscular pós-treino. Relação AST/ALT ajuda na interpretação de esteatose.',
    references: ['MS', 'AASLD'],
  },
  {
    id: 'vitamin_d', name: 'Vitamina D (25-OH)', unit: 'ng/mL', category: 'vitamins',
    defaultRefMin: 30, defaultRefMax: 100,
    insightShort: 'Status de vitamina D e saúde óssea/metabólica.',
    insightExtended: 'Deficiência (<20 ng/mL) é frequente e associa-se a osteopenia, fadiga e imunidade. Suplementação conforme DRI e exposição solar.',
    references: ['DRI', 'SBEM', 'OMS'],
  },
  {
    id: 'magnesium', name: 'Magnésio', unit: 'mg/dL', category: 'vitamins',
    defaultRefMin: 1.7, defaultRefMax: 2.4,
    insightShort: 'Cofator em metabolismo glicídico e muscular.',
    insightExtended: 'Baixo magnésio associa-se a resistência insulínica, cãibras e hipertensão. Fontes: castanhas, sementes, folhas verdes escuras.',
    references: ['DRI', 'OMS'],
  },
  {
    id: 'zinc', name: 'Zinco', unit: 'µg/dL', category: 'vitamins',
    defaultRefMin: 70, defaultRefMax: 120,
    insightShort: 'Mineral envolvido em imunidade e paladar.',
    insightExtended: 'Deficiência pode afetar apetite, cicatrização e tolerância alimentar. Carnes, ovos e leguminosas são boas fontes.',
    references: ['DRI'],
  },
  {
    id: 'crp_us', name: 'PCR-us', unit: 'mg/L', category: 'inflammation',
    defaultRefMin: null, defaultRefMax: 3,
    insightShort: 'Marcador de inflamação sistêmica de baixo grau.',
    insightExtended: 'PCR elevada associa-se a risco cardiometabólico, obesidade e dieta inflamatória. Padrão mediterrâneo, Ômega-3 e perda de peso tendem a reduzir PCR.',
    references: ['OMS', 'SBC'],
  },
]

export function findBiomarkerCatalogEntry(markerId: string): BiomarkerCatalogEntry | null {
  return LAB_BIOMARKER_CATALOG.find((item) => item.id === markerId) || null
}

export function biomarkerCategoryLabel(categoryId: string): string {
  return BIOMARKER_CATEGORIES.find((item) => item.id === categoryId)?.label || 'Outros'
}

// ── Date helpers ───────────────────────────────────────────────────────────────

export function formatExameDate(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatExameShortDate(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function sortExamesByDate(exames: Exame[]): Exame[] {
  return [...exames].sort((a, b) => {
    const da = String(a.collectedAt || a.createdAt || '')
    const db = String(b.collectedAt || b.createdAt || '')
    return da.localeCompare(db)
  })
}

// ── Status helpers ─────────────────────────────────────────────────────────────

export function getBiomarkerStatus(
  value: number | string | null | undefined,
  refMin: number | null | undefined,
  refMax: number | null | undefined,
): 'low' | 'high' | 'normal' | 'unknown' {
  const num = Number(value)
  if (!Number.isFinite(num)) return 'unknown'
  if (refMin != null && num < Number(refMin)) return 'low'
  if (refMax != null && num > Number(refMax)) return 'high'
  if (refMin != null || refMax != null) return 'normal'
  return 'unknown'
}

export function biomarkerStatusLabel(status: string): string {
  if (status === 'low') return 'Abaixo da referência'
  if (status === 'high') return 'Acima da referência'
  if (status === 'normal') return 'Dentro da referência'
  return 'Sem referência'
}

export function biomarkerStatusTone(status: string): string {
  if (status === 'low') return 'low'
  if (status === 'high') return 'high'
  if (status === 'normal') return 'normal'
  return 'neutral'
}

export function getBiomarkerInsight(
  markerId: string,
  status: string,
): { short: string; extended: string; references: string[] } {
  const catalog = markerId ? findBiomarkerCatalogEntry(markerId) : null
  if (!catalog) {
    return { short: 'Sem interpretação cadastrada para este biomarcador.', extended: '', references: [] }
  }
  let statusNote = ''
  if (status === 'high') statusNote = 'Valor acima da referência. '
  else if (status === 'low') statusNote = 'Valor abaixo da referência. '
  else if (status === 'normal') statusNote = 'Valor dentro da faixa de referência. '
  return {
    short: `${statusNote}${catalog.insightShort}`,
    extended: catalog.insightExtended,
    references: catalog.references || [],
  }
}

// ── Reference helpers ──────────────────────────────────────────────────────────

export function formatReferenceRange(
  refMin: number | null | undefined,
  refMax: number | null | undefined,
  unit = '',
): string {
  const suffix = unit ? ` ${unit}` : ''
  if (refMin != null && refMax != null) return `${refMin}–${refMax}${suffix}`
  if (refMin != null) return `≥ ${refMin}${suffix}`
  if (refMax != null) return `≤ ${refMax}${suffix}`
  return '—'
}

export function buildReferenceMapFromExam(
  exam: Exame,
): Map<string, { refMin: number | null; refMax: number | null; unit: string }> {
  const map = new Map<string, { refMin: number | null; refMax: number | null; unit: string }>()
  for (const row of exam?.biomarkers || []) {
    const key = row.markerId || row.name
    map.set(key, {
      refMin: row.refMin ?? null,
      refMax: row.refMax ?? null,
      unit: row.unit || '',
    })
  }
  return map
}

// ── Delta helpers ──────────────────────────────────────────────────────────────

export function computeDelta(
  current: number | string | null | undefined,
  previous: number | string | null | undefined,
): { absolute: number; percent: number | null } | null {
  const cur = Number(current)
  const prev = Number(previous)
  if (!Number.isFinite(cur) || !Number.isFinite(prev)) return null
  const absolute = cur - prev
  const percent = prev !== 0 ? (absolute / prev) * 100 : null
  return { absolute, percent }
}

export function formatDelta(delta: { absolute: number; percent: number | null } | null): string {
  if (!delta || !Number.isFinite(delta.absolute)) return ''
  const sign = delta.absolute > 0 ? '+' : ''
  const abs = Number.isInteger(delta.absolute)
    ? `${sign}${delta.absolute}`
    : `${sign}${delta.absolute.toFixed(1)}`
  if (delta.percent != null && Number.isFinite(delta.percent)) {
    const pctSign = delta.percent > 0 ? '+' : ''
    return `${abs} (${pctSign}${delta.percent.toFixed(1)}%)`
  }
  return abs
}

export function deltaTone(delta: { absolute: number } | null): string {
  if (!delta || delta.absolute === 0) return 'neutral'
  return delta.absolute > 0 ? 'up' : 'down'
}

// ── Comparison matrix ──────────────────────────────────────────────────────────

export type ComparisonCell = {
  examId: string
  value: number | string | null | undefined
  delta: { absolute: number; percent: number | null } | null
  deltaLabel: string
  deltaTone: string
  status: string
}

export type ComparisonRow = {
  markerId: string
  name: string
  unit: string
  category: string
  refMin: number | null
  refMax: number | null
  values: Record<string, number | string | null | undefined>
  categoryLabel: string
  referenceLabel: string
  insightShort: string
  insightExtended: string
  references: string[]
  cells: ComparisonCell[]
}

export type ComparisonCategory = {
  id: string
  label: string
  rows: ComparisonRow[]
}

export type ComparisonMatrix = {
  exams: Exame[]
  categories: ComparisonCategory[]
  rows: ComparisonRow[]
  referenceSourceExamId?: string
}

export type TrendPoint = {
  x: number
  date: string | null | undefined
  label: string
  value: number | string | null
}

export type TrendChart = {
  markerId: string
  name: string
  unit: string
  refMin: number | null
  refMax: number | null
  points: TrendPoint[]
  dates: (string | null | undefined)[]
}

export type TrendGroup = {
  id: string
  label: string
  charts: TrendChart[]
}

function markerKey(row: BiomarkerRow): string {
  return row.markerId || row.name
}

export function buildComparisonMatrix(
  exames: Exame[],
  selectedIds: string[] = [],
  options: { referenceSourceExamId?: string } = {},
): ComparisonMatrix {
  const { referenceSourceExamId = '' } = options
  const selected = sortExamesByDate(exames.filter((exam) => selectedIds.includes(exam.id)))

  if (selected.length < 2) {
    return { exams: selected, categories: [], rows: [] }
  }

  const refExam = referenceSourceExamId
    ? selected.find((exam) => exam.id === referenceSourceExamId) || selected[0]
    : null
  const refMap = refExam ? buildReferenceMapFromExam(refExam) : null

  const markerMap = new Map<string, {
    markerId: string
    name: string
    unit: string
    category: string
    refMin: number | null
    refMax: number | null
    values: Record<string, number | string | null | undefined>
  }>()

  for (const exam of selected) {
    for (const row of exam.biomarkers || []) {
      const key = markerKey(row)
      if (!markerMap.has(key)) {
        const catalog = row.markerId ? findBiomarkerCatalogEntry(row.markerId) : null
        markerMap.set(key, {
          markerId: row.markerId || '',
          name: row.name,
          unit: row.unit || catalog?.unit || '',
          category: row.category || catalog?.category || 'other',
          refMin: row.refMin ?? catalog?.defaultRefMin ?? null,
          refMax: row.refMax ?? catalog?.defaultRefMax ?? null,
          values: {},
        })
      }
      const entry = markerMap.get(key)!
      entry.values[exam.id] = row.value
      if (!entry.unit && row.unit) entry.unit = row.unit
    }
  }

  if (refMap) {
    for (const entry of markerMap.values()) {
      const ref = refMap.get(entry.markerId || entry.name)
      if (ref) {
        entry.refMin = ref.refMin
        entry.refMax = ref.refMax
        if (ref.unit) entry.unit = ref.unit
      }
    }
  }

  const rows: ComparisonRow[] = [...markerMap.values()]
    .map((entry) => {
      const cells: ComparisonCell[] = selected.map((exam, index) => {
        const value = entry.values[exam.id]
        const prevExam = index > 0 ? selected[index - 1] : null
        const prevValue = prevExam ? entry.values[prevExam.id] : null
        const delta = prevExam ? computeDelta(value, prevValue) : null
        const status = getBiomarkerStatus(value, entry.refMin, entry.refMax)
        return {
          examId: exam.id,
          value,
          delta,
          deltaLabel: formatDelta(delta),
          deltaTone: deltaTone(delta),
          status,
        }
      })
      const catalog = entry.markerId ? findBiomarkerCatalogEntry(entry.markerId) : null
      return {
        ...entry,
        categoryLabel: biomarkerCategoryLabel(entry.category),
        referenceLabel: formatReferenceRange(entry.refMin, entry.refMax, entry.unit),
        insightShort: catalog?.insightShort || '',
        insightExtended: catalog?.insightExtended || '',
        references: catalog?.references || [],
        cells,
      }
    })
    .sort((a, b) => {
      const cat = a.category.localeCompare(b.category)
      if (cat !== 0) return cat
      return a.name.localeCompare(b.name)
    })

  const categoryIds = [...new Set(rows.map((row) => row.category))]
  const categories: ComparisonCategory[] = categoryIds
    .map((id) => ({
      id,
      label: biomarkerCategoryLabel(id),
      rows: rows.filter((row) => row.category === id),
    }))
    .filter((cat) => cat.rows.length > 0)

  return {
    exams: selected,
    categories,
    rows,
    referenceSourceExamId: refExam?.id || '',
  }
}

export function buildTrendChartSeries(matrix: ComparisonMatrix): TrendGroup[] {
  if (!matrix?.exams?.length || !matrix?.rows?.length) return []

  return matrix.categories
    .map((category) => ({
      id: category.id,
      label: category.label,
      charts: category.rows
        .map((row) => {
          const points: TrendPoint[] = matrix.exams
            .map((exam, index) => ({
              x: index,
              date: exam.collectedAt,
              label: formatExameShortDate(exam.collectedAt),
              value: row.values[exam.id] ?? null,
            }))
            .filter((p): p is TrendPoint => p.value != null)

          return {
            markerId: row.markerId,
            name: row.name,
            unit: row.unit,
            refMin: row.refMin,
            refMax: row.refMax,
            points,
            dates: matrix.exams.map((e) => e.collectedAt),
          }
        })
        .filter((chart) => chart.points.length >= 2),
    }))
    .filter((group) => group.charts.length > 0)
}

export function canCompare(selectedIds: string[]): boolean {
  return Array.isArray(selectedIds) && selectedIds.length >= 2
}

export function examePreviewText(exame: Exame): string {
  const count = exame?.biomarkers?.length || 0
  const lab = exame?.labName ? ` · ${exame.labName}` : ''
  if (!count) return `Sem biomarcadores${lab}`
  return `${count} biomarcador(es)${lab}`
}

export function exameStatusLabel(status?: string | null): string {
  return status === 'draft' ? 'Rascunho' : 'Registrado'
}

export function formatValue(value: number | string | null | undefined): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return Number.isInteger(num) ? String(num) : num.toFixed(1).replace(/\.0$/, '')
}
