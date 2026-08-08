import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  computeDelta,
  formatDelta,
  getBiomarkerStatus,
  buildComparisonMatrix,
  buildTrendChartSeries,
  getBiomarkerInsight,
} from '../utils/lab-exam-comparison.js'
import { normalizeExame, sortExamesByDate } from '../utils/lab-exams.js'

describe('lab exam comparison', () => {
  const exames = [
    normalizeExame({
      id: 'e1',
      title: 'Exame A',
      collectedAt: '2025-01-10',
      biomarkers: [
        { markerId: 'glucose_fasting', name: 'Glicemia de jejum', value: 92, unit: 'mg/dL', refMin: 70, refMax: 99 },
        { markerId: 'ldl', name: 'LDL-colesterol', value: 140, unit: 'mg/dL', refMax: 130 },
      ],
    }),
    normalizeExame({
      id: 'e2',
      title: 'Exame B',
      collectedAt: '2025-06-15',
      biomarkers: [
        { markerId: 'glucose_fasting', name: 'Glicemia de jejum', value: 88, unit: 'mg/dL', refMin: 70, refMax: 99 },
        { markerId: 'ldl', name: 'LDL-colesterol', value: 118, unit: 'mg/dL', refMax: 100 },
      ],
    }),
  ]

  it('ordena exames por data de coleta', () => {
    const sorted = sortExamesByDate(exames)
    assert.equal(sorted[0].id, 'e1')
    assert.equal(sorted[1].id, 'e2')
  })

  it('classifica status do biomarcador', () => {
    assert.equal(getBiomarkerStatus(88, 70, 99), 'normal')
    assert.equal(getBiomarkerStatus(140, null, 130), 'high')
    assert.equal(getBiomarkerStatus(65, 70, 99), 'low')
  })

  it('calcula delta entre coletas', () => {
    const delta = computeDelta(88, 92)
    assert.equal(delta.absolute, -4)
    assert.ok(Math.abs(delta.percent + 4.347) < 0.1)
    assert.match(formatDelta(delta), /-4/)
  })

  it('monta matriz de comparação lado a lado', () => {
    const matrix = buildComparisonMatrix(exames, ['e1', 'e2'])
    assert.equal(matrix.exams.length, 2)
    assert.equal(matrix.exams[0].id, 'e1')
    assert.ok(matrix.rows.length >= 2)
    const glucose = matrix.rows.find((row) => row.markerId === 'glucose_fasting')
    assert.equal(glucose.cells[1].deltaLabel, '-4 (-4.3%)')
  })

  it('padroniza referências pela data escolhida', () => {
    const matrix = buildComparisonMatrix(exames, ['e1', 'e2'], { referenceSourceExamId: 'e2' })
    const ldl = matrix.rows.find((row) => row.markerId === 'ldl')
    assert.equal(ldl.refMax, 100)
  })

  it('gera séries para gráficos por categoria', () => {
    const matrix = buildComparisonMatrix(exames, ['e1', 'e2'])
    const groups = buildTrendChartSeries(matrix)
    assert.ok(groups.length >= 1)
    assert.ok(groups[0].charts.length >= 1)
    assert.equal(groups[0].charts[0].points.length, 2)
  })

  it('retorna insight clínico por biomarcador', () => {
    const insight = getBiomarkerInsight('glucose_fasting', 'high')
    assert.match(insight.short, /acima da referência/i)
    assert.ok(insight.references.length >= 1)
  })
})
