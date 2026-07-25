import {
  biomarkerCategoryLabel,
  findBiomarkerCatalogEntry,
  sortExamesByDate,
} from './lab-exams.js'

export function getBiomarkerStatus(value, refMin, refMax) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 'unknown'
  if (refMin != null && num < Number(refMin)) return 'low'
  if (refMax != null && num > Number(refMax)) return 'high'
  if (refMin != null || refMax != null) return 'normal'
  return 'unknown'
}

export function biomarkerStatusLabel(status) {
  if (status === 'low') return 'Abaixo da referência'
  if (status === 'high') return 'Acima da referência'
  if (status === 'normal') return 'Dentro da referência'
  return 'Sem referência'
}

export function biomarkerStatusTone(status) {
  if (status === 'low') return 'low'
  if (status === 'high') return 'high'
  if (status === 'normal') return 'normal'
  return 'neutral'
}

export function formatReferenceRange(refMin, refMax, unit = '') {
  const suffix = unit ? ` ${unit}` : ''
  if (refMin != null && refMax != null) return `${refMin}–${refMax}${suffix}`
  if (refMin != null) return `≥ ${refMin}${suffix}`
  if (refMax != null) return `≤ ${refMax}${suffix}`
  return '—'
}

export function resolveBiomarkerReference(marker, exam, referenceSourceExamId = '') {
  if (referenceSourceExamId && referenceSourceExamId !== exam.id) {
    const sourceExam = referenceSourceExamId
    void sourceExam
  }
  const row = exam?.biomarkers?.find((item) => (
    (marker.markerId && item.markerId === marker.markerId)
    || item.name === marker.name
  ))
  if (row) {
    return {
      refMin: row.refMin ?? marker.refMin ?? null,
      refMax: row.refMax ?? marker.refMax ?? null,
      unit: row.unit || marker.unit,
    }
  }
  return {
    refMin: marker.refMin ?? null,
    refMax: marker.refMax ?? null,
    unit: marker.unit,
  }
}

export function buildReferenceMapFromExam(exam) {
  const map = new Map()
  for (const row of exam?.biomarkers || []) {
    const key = row.markerId || row.name
    map.set(key, { refMin: row.refMin ?? null, refMax: row.refMax ?? null, unit: row.unit })
  }
  return map
}

export function computeDelta(current, previous) {
  const cur = Number(current)
  const prev = Number(previous)
  if (!Number.isFinite(cur) || !Number.isFinite(prev)) return null
  const absolute = cur - prev
  const percent = prev !== 0 ? (absolute / prev) * 100 : null
  return { absolute, percent }
}

export function formatDelta(delta) {
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

export function deltaTone(delta) {
  if (!delta || delta.absolute === 0) return 'neutral'
  return delta.absolute > 0 ? 'up' : 'down'
}

function markerKey(row) {
  return row.markerId || row.name
}

export function buildComparisonMatrix(exames, selectedIds = [], options = {}) {
  const { referenceSourceExamId = '' } = options
  const selected = sortExamesByDate(
    exames.filter((exam) => selectedIds.includes(exam.id)),
  )
  if (selected.length < 2) {
    return { exams: selected, categories: [], rows: [] }
  }

  const refExam = referenceSourceExamId
    ? selected.find((exam) => exam.id === referenceSourceExamId) || selected[0]
    : null
  const refMap = refExam ? buildReferenceMapFromExam(refExam) : null

  const markerMap = new Map()
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
      const entry = markerMap.get(key)
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

  const rows = [...markerMap.values()]
    .map((entry) => {
      const cells = selected.map((exam, index) => {
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

  const categories = [...new Set(rows.map((row) => row.category))]
    .map((id) => ({
      id,
      label: biomarkerCategoryLabel(id),
      rows: rows.filter((row) => row.category === id),
    }))
    .filter((cat) => cat.rows.length)

  return { exams: selected, categories, rows, referenceSourceExamId: refExam?.id || '' }
}

export function buildTrendChartSeries(matrix) {
  if (!matrix?.exams?.length || !matrix?.rows?.length) return []
  const dates = matrix.exams.map((exam) => exam.collectedAt)

  return matrix.categories.map((category) => ({
    id: category.id,
    label: category.label,
    charts: category.rows.map((row) => {
      const points = matrix.exams.map((exam, index) => ({
        x: index,
        date: exam.collectedAt,
        label: formatExameShortDate(exam.collectedAt),
        value: row.values[exam.id] ?? null,
      })).filter((point) => point.value != null)

      return {
        markerId: row.markerId,
        name: row.name,
        unit: row.unit,
        refMin: row.refMin,
        refMax: row.refMax,
        points,
        dates,
      }
    }).filter((chart) => chart.points.length >= 2),
  })).filter((group) => group.charts.length)
}

function formatExameShortDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function getBiomarkerInsight(markerId, status) {
  const catalog = markerId ? findBiomarkerCatalogEntry(markerId) : null
  if (!catalog) {
    return {
      short: 'Sem interpretação cadastrada para este biomarcador.',
      extended: '',
      references: [],
    }
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

export function selectedExamsFromIds(exames, ids) {
  return sortExamesByDate(exames.filter((exam) => ids.includes(exam.id)))
}

export function canCompare(selectedIds) {
  return Array.isArray(selectedIds) && selectedIds.length >= 2
}
