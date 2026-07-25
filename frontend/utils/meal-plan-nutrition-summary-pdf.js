import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  BRAND_LOGO_NATURAL_HEIGHT,
  BRAND_LOGO_NATURAL_WIDTH,
  BRAND_LOGO_SRC,
  brandLogoWidthForHeight,
} from '~/config/brand-logo.js'
import {
  buildNutritionSummaryDocumentModel,
  nutritionSummaryPdfFilename,
} from '~/utils/meal-plan-nutrition-summary-payload.js'

const MARGIN = 14
const FOOTER_LOGO_H = 6
const FOOTER_GAP_AFTER_LINE = 1.5
const FOOTER_BOTTOM_PAD = 7
const FOOTER_H = FOOTER_BOTTOM_PAD + FOOTER_LOGO_H + FOOTER_GAP_AFTER_LINE + 2

const MACRO_RGB = {
  carbs: [37, 99, 235],
  protein: [220, 38, 38],
  fat: [217, 119, 6],
}

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

function drawSummaryHeader(doc, yStart, { printContext, logoAsset }) {
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = yStart

  drawLogo(doc, logoAsset, pageWidth - MARGIN, y - 1, 10, 'right')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(138, 146, 136)
  doc.text('Resumo Nutricional', MARGIN, y)
  y += 5.5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(44, 50, 44)
  doc.text(String(printContext?.planTitle || 'Plano alimentar'), MARGIN, y, {
    maxWidth: pageWidth - MARGIN * 2 - 32,
  })
  y += 8

  const meta = [
    ['Paciente', printContext?.patientName],
    ['Período', printContext?.period],
    ['Início', printContext?.startDate],
    ['Objetivo', printContext?.objective],
  ]

  const colW = (pageWidth - MARGIN * 2) / 4
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

  y += 11
  doc.setDrawColor(232, 236, 233)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)

  return y + 6
}

function drawStackedMacroBar(doc, x, y, width, height, percents) {
  doc.setFillColor(236, 239, 236)
  doc.roundedRect(x, y, width, height, 1.2, 1.2, 'F')

  const segments = [
    { key: 'carbs', pct: percents.carbs || 0 },
    { key: 'protein', pct: percents.protein || 0 },
    { key: 'fat', pct: percents.fat || 0 },
  ]

  let cursor = x
  segments.forEach((segment) => {
    const segmentWidth = (width * segment.pct) / 100
    if (segmentWidth <= 0) return
    doc.setFillColor(...MACRO_RGB[segment.key])
    doc.roundedRect(cursor, y, segmentWidth, height, 1.2, 1.2, 'F')
    cursor += segmentWidth
  })
}

function drawTotalsBlock(doc, yStart, model) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - MARGIN * 2
  let y = yStart

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(44, 50, 44)
  doc.text('Total do plano', MARGIN, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(44, 50, 44)
  doc.text(String(model.kcalLabel || '—'), MARGIN, y)
  y += 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(95, 103, 95)
  doc.text('Energia total prescrita', MARGIN, y + 4)
  y += 12

  drawStackedMacroBar(doc, MARGIN, y, contentWidth, 5, model.percents)
  y += 9

  const cardWidth = (contentWidth - 6) / 3
  model.legend.forEach((item, index) => {
    const x = MARGIN + (cardWidth + 3) * index
    const rgb = MACRO_RGB[item.id === 'carbs' ? 'carbs' : item.id === 'protein' ? 'protein' : 'fat']

    doc.setFillColor(248, 250, 249)
    doc.setDrawColor(232, 236, 233)
    doc.roundedRect(x, y, cardWidth, 18, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...rgb)
    doc.text(String(item.label || ''), x + 3, y + 5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(44, 50, 44)
    doc.text(`${item.percent}%`, x + 3, y + 11.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(95, 103, 95)
    doc.text(String(item.grams || '—'), x + 3, y + 16)
  })

  return y + 24
}

function drawMealsTable(doc, yStart, model) {
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = yStart

  if (y > doc.internal.pageSize.getHeight() - FOOTER_H - 24) {
    doc.addPage()
    y = MARGIN
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(44, 50, 44)
  doc.text('Distribuição por refeição', MARGIN, y)
  y += 3

  const body = (model.meals || []).map((meal) => [
    meal.label || '—',
    meal.caloriesLabel || '—',
    `${meal.carbsLabel || '—'} (${meal.carbsPctLabel || '0%'})`,
    `${meal.proteinLabel || '—'} (${meal.proteinPctLabel || '0%'})`,
    `${meal.fatLabel || '—'} (${meal.fatPctLabel || '0%'})`,
  ])

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: FOOTER_H },
    theme: 'plain',
    tableWidth: pageWidth - MARGIN * 2,
    head: [['Refeição', 'Energia', 'Carboidratos', 'Proteínas', 'Lipídios']],
    body: body.length ? body : [['Nenhuma refeição cadastrada', '—', '—', '—', '—']],
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: { top: 2.2, right: 2.5, bottom: 2.2, left: 2.5 },
      lineWidth: 0,
      textColor: [68, 74, 68],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [248, 250, 249],
      textColor: [95, 103, 95],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 52 },
      1: { cellWidth: 24, halign: 'right' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [252, 253, 252],
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1 && data.cursor.y <= MARGIN + 4) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(44, 50, 44)
        doc.text('Distribuição por refeição (continuação)', MARGIN, MARGIN + 2)
      }
    },
  })

  y = (doc.lastAutoTable?.finalY || y) + 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.2)
  doc.setTextColor(138, 146, 136)
  doc.text(
    'Percentuais entre parênteses referem-se à distribuição de macronutrientes de cada refeição.',
    MARGIN,
    y,
    { maxWidth: pageWidth - MARGIN * 2 },
  )

  return y + 4
}

export async function generateMealPlanNutritionSummaryPdf(payload = {}) {
  const model = buildNutritionSummaryDocumentModel(payload)
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const logoAsset = await loadLogoAsset().catch(() => null)

  let y = MARGIN
  y = drawSummaryHeader(doc, y, { printContext: model.printContext, logoAsset })
  y = drawTotalsBlock(doc, y, model)
  drawMealsTable(doc, y, model)

  drawFooters(doc, {
    logoAsset,
    nutritionistName: payload.nutritionistName || 'Nutricionista',
  })

  return doc.output('blob')
}

export async function openMealPlanNutritionSummaryPdfInNewTab(payload = {}) {
  if (typeof window === 'undefined') return false

  const blob = await generateMealPlanNutritionSummaryPdf(payload)
  const url = URL.createObjectURL(blob)
  const opened = window.open(url, '_blank')

  if (!opened) {
    const link = document.createElement('a')
    link.href = url
    link.download = nutritionSummaryPdfFilename(payload.printContext)
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    return true
  }

  opened.addEventListener('beforeunload', () => URL.revokeObjectURL(url), { once: true })
  window.setTimeout(() => URL.revokeObjectURL(url), 300000)
  return true
}
