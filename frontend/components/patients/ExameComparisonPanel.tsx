'use client'

import { useState } from 'react'
import type { Exame } from '@/lib/types'
import {
  buildComparisonMatrix,
  buildTrendChartSeries,
  biomarkerStatusLabel,
  biomarkerStatusTone,
  getBiomarkerInsight,
  formatExameDate,
  formatValue,
  type ComparisonMatrix,
  type TrendChart,
} from '@/lib/lab-exams'
import s from './ExameComparisonPanel.module.scss'

// ── BiomarkerInsight ──────────────────────────────────────────────────────────

function BiomarkerInsight({
  markerId,
  status,
  children,
}: {
  markerId: string
  status: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const tone = biomarkerStatusTone(status)
  const label = biomarkerStatusLabel(status)
  const insight = getBiomarkerInsight(markerId, status)

  return (
    <span
      className={`${s.insight} ${s[`insight--${tone}`] || ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      {children}
      {open && (insight.short || insight.extended) && (
        <span className={s.insightPopover} role="tooltip">
          <strong>{label}</strong>
          <p>{insight.short}</p>
          {insight.extended && (
            <p className={s.insightExtended}>{insight.extended}</p>
          )}
          {insight.references.length > 0 && (
            <p className={s.insightRefs}>
              Referências: {insight.references.join(' · ')}
            </p>
          )}
        </span>
      )}
    </span>
  )
}

// ── TrendChartFigure ──────────────────────────────────────────────────────────

function TrendChartFigure({ chart }: { chart: TrendChart }) {
  const width = 280
  const height = 96
  const padding = 16
  const innerWidth = width - padding * 2
  const innerHeight = height - padding * 2

  const values = chart.points
    .map((p) => Number(p.value))
    .filter(Number.isFinite)

  if (values.length < 2) return null

  let domainMin = Math.min(...values)
  let domainMax = Math.max(...values)
  if (chart.refMin != null) domainMin = Math.min(domainMin, Number(chart.refMin))
  if (chart.refMax != null) domainMax = Math.max(domainMax, Number(chart.refMax))
  if (domainMin === domainMax) { domainMin -= 1; domainMax += 1 }
  const pad = (domainMax - domainMin) * 0.12
  domainMin -= pad
  domainMax += pad

  function scaleY(value: number): number {
    const ratio = (value - domainMin) / (domainMax - domainMin)
    return padding + innerHeight - ratio * innerHeight
  }

  function scaleX(index: number, total: number): number {
    if (total <= 1) return padding + innerWidth / 2
    return padding + (index / (total - 1)) * innerWidth
  }

  const total = chart.points.length
  const plottedPoints = chart.points.map((p, i) => ({
    x: scaleX(i, total),
    y: scaleY(Number(p.value)),
  }))

  const linePoints = plottedPoints.map((p) => `${p.x},${p.y}`).join(' ')

  let refBand: { y: number; height: number } | null = null
  if (chart.refMin != null || chart.refMax != null) {
    const yTop = scaleY(chart.refMax != null ? Number(chart.refMax) : domainMax)
    const yBottom = scaleY(chart.refMin != null ? Number(chart.refMin) : domainMin)
    refBand = { y: yTop, height: Math.max(2, yBottom - yTop) }
  }

  const refParts: string[] = []
  if (chart.refMin != null) refParts.push(`≥${chart.refMin}`)
  if (chart.refMax != null) refParts.push(`≤${chart.refMax}`)
  const unitLabel = [chart.unit, refParts.length ? `· ref ${refParts.join(' / ')}` : '']
    .filter(Boolean).join(' ')

  return (
    <figure className={s.trendChart}>
      <figcaption className={s.trendHead}>
        <strong>{chart.name}</strong>
        <span>{unitLabel}</span>
      </figcaption>
      <svg
        className={s.trendSvg}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Evolução de ${chart.name}`}
      >
        {refBand && (
          <rect
            x={padding}
            y={refBand.y}
            width={innerWidth}
            height={refBand.height}
            className={s.trendRefBand}
          />
        )}
        <polyline
          points={linePoints}
          className={s.trendLine}
          fill="none"
        />
        {plottedPoints.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={3.5} className={s.trendDot} />
        ))}
      </svg>
      <div className={s.trendLabels}>
        {chart.points.map((p, i) => (
          <span key={i}>{p.label}</span>
        ))}
      </div>
    </figure>
  )
}

// ── ValueCell ─────────────────────────────────────────────────────────────────

function ValueCell({
  markerId,
  status,
  value,
  unit,
  deltaLabel,
  deltaTone,
}: {
  markerId: string
  status: string
  value: number | string | null | undefined
  unit: string
  deltaLabel: string
  deltaTone: string
}) {
  if (value == null) return <span className={s.valueEmpty}>—</span>

  const numClass =
    status === 'low' ? s.valueNumLow
    : status === 'high' ? s.valueNumHigh
    : status === 'normal' ? s.valueNumNormal
    : ''

  const deltaClass =
    deltaTone === 'up' ? s.deltaUp
    : deltaTone === 'down' ? s.deltaDown
    : ''

  return (
    <>
      <BiomarkerInsight markerId={markerId} status={status}>
        <span className={`${s.valueNum} ${numClass}`}>
          {formatValue(value)}
          {unit && <small>{unit}</small>}
        </span>
      </BiomarkerInsight>
      {deltaLabel && (
        <span className={`${s.delta} ${deltaClass}`}>{deltaLabel}</span>
      )}
    </>
  )
}

// ── TableView ─────────────────────────────────────────────────────────────────

function TableView({ matrix }: { matrix: ComparisonMatrix }) {
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>Biomarcador</th>
            <th>Referência</th>
            {matrix.exams.map((exam) => (
              <th key={exam.id}>
                {formatExameDate(exam.collectedAt)}
                <small>{exam.labName || exam.title}</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.categories.map((category) => (
            <>
              <tr key={`cat-${category.id}`} className={s.categoryRow}>
                <td colSpan={2 + matrix.exams.length}>{category.label}</td>
              </tr>
              {category.rows.map((row) => (
                <tr key={row.markerId || row.name}>
                  <td className={s.markerCell}>{row.name}</td>
                  <td className={s.refCell}>{row.referenceLabel}</td>
                  {row.cells.map((cell) => (
                    <td key={cell.examId} className={s.valueCell}>
                      <ValueCell
                        markerId={row.markerId}
                        status={cell.status}
                        value={cell.value}
                        unit={row.unit}
                        deltaLabel={cell.deltaLabel}
                        deltaTone={cell.deltaTone}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── ChartsView ────────────────────────────────────────────────────────────────

function ChartsView({ matrix }: { matrix: ComparisonMatrix }) {
  const groups = buildTrendChartSeries(matrix)

  if (!groups.length) {
    return (
      <p className={s.empty}>
        Selecione conjuntos com biomarcadores repetidos para ver a evolução.
      </p>
    )
  }

  return (
    <div className={s.charts}>
      {groups.map((group) => (
        <section key={group.id}>
          <h4 className={s.chartGroupTitle}>{group.label}</h4>
          <div className={s.chartGrid}>
            {group.charts.map((chart) => (
              <TrendChartFigure key={chart.markerId || chart.name} chart={chart} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

// ── ExameComparisonPanel ──────────────────────────────────────────────────────

export type ExameComparisonPanelProps = {
  exames: Exame[]
  selectedIds: string[]
}

export function ExameComparisonPanel({ exames, selectedIds }: ExameComparisonPanelProps) {
  const [view, setView] = useState<'table' | 'charts'>('table')
  const [refSourceId, setRefSourceId] = useState('')

  const matrix = buildComparisonMatrix(exames, selectedIds, {
    referenceSourceExamId: refSourceId,
  })

  return (
    <div className={`admin-shell-card ${s.panel}`}>
      <div className={s.head}>
        <div>
          <h3>Comparação de biomarcadores</h3>
          <p>{matrix.exams.length} conjunto(s) · da data mais antiga à mais recente</p>
        </div>
        <div className={s.refField}>
          <span className={s.refLabel}>Padronizar referências por</span>
          <select
            className={s.refSelect}
            value={refSourceId}
            onChange={(e) => setRefSourceId(e.target.value)}
          >
            <option value="">Referência de cada coleta</option>
            {matrix.exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {formatExameDate(exam.collectedAt)} — {exam.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={s.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'table'}
          className={`${s.tab}${view === 'table' ? ` ${s.tabActive}` : ''}`}
          onClick={() => setView('table')}
        >
          Tabela
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'charts'}
          className={`${s.tab}${view === 'charts' ? ` ${s.tabActive}` : ''}`}
          onClick={() => setView('charts')}
        >
          Gráficos
        </button>
      </div>

      {view === 'table' ? (
        <TableView matrix={matrix} />
      ) : (
        <ChartsView matrix={matrix} />
      )}
    </div>
  )
}
