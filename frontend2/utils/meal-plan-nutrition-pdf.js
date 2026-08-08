import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  BRAND_LOGO_NATURAL_HEIGHT,
  BRAND_LOGO_NATURAL_WIDTH,
  BRAND_LOGO_SRC,
  brandLogoWidthForHeight,
} from '~/config/brand-logo.js'
import { formatMacroGrams, formatMacroKcal } from '~/utils/meal-plan-nutrition-report.js'

const MARGIN = 12
const FOOTER_LOGO_H = 6
const FOOTER_GAP_AFTER_LINE = 1.5
const FOOTER_BOTTOM_PAD = 7
const FOOTER_H = FOOTER_BOTTOM_PAD + FOOTER_LOGO_H + FOOTER_GAP_AFTER_LINE + 2

const BAR_RGB = {
  neutral: [180, 186, 180],
  low: [245, 158, 11],
  ok: [34, 197, 94],
  high: [239, 68, 68],
}

const TRACK_RGB = [232, 236, 233]

async function loadLogoAsset(origin = '') {
  if (typeof window === 'undefined') return null
  const base = origin || window.location.origin
  const res = await fetch(`${base}${BRAND_LOGO_SRC}`)
  if (!res.ok) return null
  const svgText = await res.text()
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)

  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const naturalW = img.naturalWidth || BRAND_LOGO_NATURAL_WIDTH
        const naturalH = img.naturalHeight || BRAND_LOGO_NATURAL_HEIGHT
        const scale = 3
        const canvas = document.createElement('canvas')
        canvas.width = naturalW * scale
        canvas.height = naturalH * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: naturalW,
          height: naturalH,
        })
      }
      img.onerror = reject
      img.src = objectUrl
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function drawLogo(doc, logoAsset, x, y, heightMm, align = 'left') {
  if (!logoAsset?.dataUrl || !heightMm) return
  const widthMm = brandLogoWidthForHeight(heightMm)
  const drawX = align === 'right' ? x - widthMm : x
  doc.addImage(logoAsset.dataUrl, 'PNG', drawX, y, widthMm, heightMm)
}

function drawFooters(doc, { logoAsset, nutritionistName }) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const total = doc.internal.getNumberOfPages()

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page)

    const logoBottomY = pageHeight - FOOTER_BOTTOM_PAD
    const logoTopY = logoBottomY - FOOTER_LOGO_H
    const lineY = logoTopY - FOOTER_GAP_AFTER_LINE
    const textBaselineY = logoTopY + FOOTER_LOGO_H * 0.72

    doc.setDrawColor(232, 236, 233)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, lineY, pageWidth - MARGIN, lineY)

    drawLogo(doc, logoAsset, MARGIN, logoTopY, FOOTER_LOGO_H, 'left')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(95, 103, 95)
    doc.text(String(nutritionistName || 'Nutricionista'), pageWidth / 2, textBaselineY, { align: 'center' })
    doc.text(`Página ${page}`, pageWidth - MARGIN, textBaselineY, { align: 'right' })
  }
}

function drawPlanHeader(doc, yStart, { printContext, logoAsset }) {
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = yStart

  drawLogo(doc, logoAsset, pageWidth - MARGIN, y - 1, 11, 'right')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(138, 146, 136)
  doc.text('Plano Alimentar', MARGIN, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(44, 50, 44)
  const title = String(printContext?.planTitle || 'Plano alimentar')
  doc.text(title, MARGIN, y, { maxWidth: pageWidth - MARGIN * 2 - 36 })
  y += 7

  const meta = [
    ['Paciente', printContext?.patientName],
    ['Data de início', printContext?.startDate],
    ['Tipo de Dieta', printContext?.dietType],
    ['Período', printContext?.period],
    ['Objetivo', printContext?.objective],
  ]

  const colW = (pageWidth - MARGIN * 2) / 5
  meta.forEach(([label, value], index) => {
    const x = MARGIN + colW * index
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(138, 146, 136)
    doc.text(String(label || '').toUpperCase(), x, y)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(44, 50, 44)
    doc.text(String(value || '—'), x, y + 3.5, { maxWidth: colW - 2 })
  })

  y += 10
  doc.setDrawColor(232, 236, 233)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)

  return y + 5
}

function drawSummaryBlock(doc, yStart, { macros }) {
  let y = yStart

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(44, 50, 44)
  doc.text('Resumo Nutricional Completo', MARGIN, y)
  y += 5.5

  const parts = [
    { label: 'Carboidratos', value: formatMacroGrams(macros?.carbsG), color: [37, 99, 235] },
    { label: 'Proteínas', value: formatMacroGrams(macros?.proteinG), color: [220, 38, 38] },
    { label: 'Lipídios', value: formatMacroGrams(macros?.fatG), color: [217, 119, 6] },
    { label: 'Total', value: formatMacroKcal(macros?.caloriesKcal), color: [124, 58, 237] },
  ]

  let x = MARGIN
  parts.forEach((part) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(95, 103, 95)
    doc.text(`${part.label}: `, x, y)
    x += doc.getTextWidth(`${part.label}: `)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...part.color)
    doc.text(String(part.value), x, y)
    x += doc.getTextWidth(String(part.value)) + 6
  })

  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(138, 146, 136)
  doc.text(
    'Valores de micronutrientes com % DRI baseados nas referências configuradas para o perfil do paciente.',
    MARGIN,
    y,
    { maxWidth: doc.internal.pageSize.getWidth() - MARGIN * 2 },
  )

  return y + 6
}

function drawBarInCell(doc, cell, row) {
  const padding = 1.2
  const trackX = cell.x + padding
  const trackY = cell.y + cell.height / 2 - 0.8
  const trackW = cell.width - padding * 2
  const trackH = 1.6
  const fillW = Math.max(0, Math.min(trackW, (trackW * (Number(row.barWidthPct) || 0)) / 100))
  const tone = BAR_RGB[row.barTone] || BAR_RGB.neutral

  doc.setFillColor(...TRACK_RGB)
  doc.roundedRect(trackX, trackY, trackW, trackH, 0.8, 0.8, 'F')

  if (fillW > 0) {
    doc.setFillColor(...tone)
    doc.roundedRect(trackX, trackY, fillW, trackH, 0.8, 0.8, 'F')
  }
}

export async function generateMealPlanNutritionPdf({
  printContext = {},
  sections = [],
  macros = {},
  nutritionistName = 'Nutricionista',
} = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentBottom = pageHeight - FOOTER_H

  const logoAsset = await loadLogoAsset().catch(() => null)

  let y = MARGIN
  y = drawPlanHeader(doc, y, { printContext, logoAsset })
  y = drawSummaryBlock(doc, y, { macros })

  const barRowsBySection = sections.map((section) => section.rows || [])

  sections.forEach((section, sectionIndex) => {
    if (y > contentBottom - 16) {
      doc.addPage()
      y = MARGIN
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(44, 50, 44)
    doc.text(String(section.title || ''), MARGIN, y)
    y += 2

    const rows = section.rows || []
    const rowMeta = barRowsBySection[sectionIndex]

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: FOOTER_H },
      theme: 'plain',
      tableWidth: pageWidth - MARGIN * 2,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: { top: 1.8, right: 2, bottom: 1.8, left: 2 },
        lineWidth: 0,
        textColor: [68, 74, 68],
      },
      columnStyles: {
        0: { cellWidth: 62 },
        1: { cellWidth: 22, halign: 'right' },
        2: { cellWidth: 68 },
        3: { cellWidth: 22, halign: 'right', textColor: [138, 146, 136], fontSize: 7.5 },
      },
      body: rows.map((row) => [
        row.label || '',
        row.displayValue || '—',
        '',
        row.pctLabel || '—',
      ]),
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          data.cell.styles.fontStyle = 'normal'
        }
        if (data.section === 'body' && data.row.index % 2 === 1) {
          data.cell.styles.fillColor = [248, 249, 248]
        }
      },
      didDrawCell: (data) => {
        if (data.section !== 'body' || data.column.index !== 2) return
        const row = rowMeta[data.row.index]
        if (!row) return
        drawBarInCell(doc, data.cell, row)
      },
    })

    y = (doc.lastAutoTable?.finalY || y) + 5
  })

  drawFooters(doc, { logoAsset, nutritionistName })
  return doc.output('blob')
}

export async function openMealPlanNutritionPdfInNewTab(payload) {
  if (typeof window === 'undefined') return false

  const blob = await generateMealPlanNutritionPdf(payload)
  const url = URL.createObjectURL(blob)
  const opened = window.open(url, '_blank')

  if (!opened) {
    URL.revokeObjectURL(url)
    return false
  }

  opened.addEventListener('beforeunload', () => URL.revokeObjectURL(url), { once: true })
  window.setTimeout(() => URL.revokeObjectURL(url), 300000)
  return true
}
