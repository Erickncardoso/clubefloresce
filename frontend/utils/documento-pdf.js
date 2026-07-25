import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  BRAND_LOGO_NATURAL_HEIGHT,
  BRAND_LOGO_NATURAL_WIDTH,
  BRAND_LOGO_SRC,
  brandLogoWidthForHeight,
} from '~/config/brand-logo.js'
import { DOCUMENTO_LOGO_SRC } from '~/utils/documento-templates.js'
import { parseTableElement } from '~/utils/html-table.js'

const MARGIN = 16
const FOOTER_H = 18
const LOGO_SRC = DOCUMENTO_LOGO_SRC || BRAND_LOGO_SRC

async function loadLogoAsset(origin = '') {
  if (typeof window === 'undefined') return null
  const base = origin || window.location.origin
  const res = await fetch(`${base}${LOGO_SRC}`)
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

function sanitizeFilename(value) {
  return String(value || 'documento')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'documento'
}

function parseHtmlBlocks(html) {
  if (typeof document === 'undefined') return []
  const root = document.createElement('div')
  root.innerHTML = String(html || '')

  const blocks = []

  function walk(node) {
    if (!node) return
    if (node.nodeType === Node.TEXT_NODE) {
      const text = String(node.textContent || '').replace(/\s+/g, ' ').trim()
      if (text) blocks.push({ type: 'text', text })
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return

    const tag = node.tagName?.toLowerCase()
    if (tag === 'br') {
      blocks.push({ type: 'break' })
      return
    }
    if (tag === 'p' || tag === 'div' || tag === 'blockquote') {
      const text = String(node.textContent || '').replace(/\s+/g, ' ').trim()
      if (text) blocks.push({ type: 'paragraph', text })
      return
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = [...node.querySelectorAll(':scope > li')].map((li) =>
        String(li.textContent || '').replace(/\s+/g, ' ').trim(),
      ).filter(Boolean)
      if (items.length) blocks.push({ type: tag === 'ol' ? 'ordered-list' : 'list', items })
      return
    }
    if (tag === 'table') {
      const tableData = parseTableElement(node)
      if (tableData.head.length || tableData.body.length) {
        blocks.push({ type: 'table', ...tableData })
      }
      return
    }
    if (tag === 'img') {
      blocks.push({ type: 'break' })
      return
    }

    for (const child of node.childNodes) walk(child)
  }

  for (const child of root.childNodes) walk(child)
  if (!blocks.length) {
    const plain = String(root.textContent || '').replace(/\s+/g, ' ').trim()
    if (plain) blocks.push({ type: 'paragraph', text: plain })
  }
  return blocks
}

function ensureSpace(doc, y, needed, context) {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (y + needed <= pageHeight - FOOTER_H) return y
  doc.addPage()
  context.page += 1
  return MARGIN
}

function drawFooters(doc, { logoAsset, authorLine }) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const total = doc.internal.getNumberOfPages()

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page)
    const lineY = pageHeight - FOOTER_H + 4
    doc.setDrawColor(232, 236, 233)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, lineY, pageWidth - MARGIN, lineY)

    drawLogo(doc, logoAsset, MARGIN, lineY + 2, 6, 'left')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(95, 103, 95)
    doc.text(String(authorLine || 'Nutricionista'), pageWidth / 2, lineY + 7, { align: 'center' })
    doc.text(`Página ${page}`, pageWidth - MARGIN, lineY + 7, { align: 'right' })
  }
}

function drawHeader(doc, yStart, input, logoAsset) {
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = yStart

  drawLogo(doc, logoAsset, pageWidth - MARGIN, y - 1, 12, 'right')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(138, 146, 136)
  doc.text(String(input.kicker || 'Documento'), MARGIN, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(44, 50, 44)
  doc.text(String(input.title || 'Documento'), MARGIN, y, { maxWidth: pageWidth - MARGIN * 2 - 30 })
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(55, 65, 55)
  doc.text(`Paciente: ${input.patientName || '—'}`, MARGIN, y)
  y += 4.5
  doc.text(`CPF: ${input.patientCpf || '—'}`, MARGIN, y)
  y += 8

  doc.setDrawColor(238, 241, 238)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)
  return y + 6
}

function drawBody(doc, yStart, html, context) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const maxWidth = pageWidth - MARGIN * 2
  let y = yStart
  const blocks = parseHtmlBlocks(html)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(55, 65, 55)

  for (const block of blocks) {
    if (block.type === 'break') {
      y += 3
      continue
    }
    if (block.type === 'paragraph' || block.type === 'text') {
      const lines = doc.splitTextToSize(block.text, maxWidth)
      y = ensureSpace(doc, y, lines.length * 5 + 2, context)
      doc.text(lines, MARGIN, y)
      y += lines.length * 5 + 2
      continue
    }
    if (block.type === 'list' || block.type === 'ordered-list') {
      block.items.forEach((item, index) => {
        const prefix = block.type === 'ordered-list' ? `${index + 1}. ` : '• '
        const lines = doc.splitTextToSize(prefix + item, maxWidth - 4)
        y = ensureSpace(doc, y, lines.length * 5 + 1, context)
        doc.text(lines, MARGIN + 2, y)
        y += lines.length * 5 + 1
      })
      y += 2
      continue
    }
    if (block.type === 'table') {
      const tableWidth = maxWidth
      const tableOptions = {
        startY: y,
        margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: FOOTER_H },
        theme: 'grid',
        tableWidth,
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 },
          textColor: [55, 65, 55],
          lineColor: [223, 228, 223],
          lineWidth: 0.2,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [243, 245, 243],
          textColor: [44, 50, 44],
          fontStyle: 'bold',
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
        },
      }

      y = ensureSpace(doc, y, 12, context)

      if (block.head?.length) {
        autoTable(doc, {
          ...tableOptions,
          head: block.head,
          body: block.body || [],
        })
      } else {
        autoTable(doc, {
          ...tableOptions,
          body: block.body || [],
        })
      }

      y = (doc.lastAutoTable?.finalY || y) + 4
    }
  }

  return y
}

export async function buildDocumentoPdf(input = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const logoAsset = await loadLogoAsset()
  const context = { page: 1 }

  let y = drawHeader(doc, MARGIN, input, logoAsset)
  y = drawBody(doc, y, input.content, context)

  y = ensureSpace(doc, y, 20, context)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(107, 115, 104)
  doc.text('Assinatura', doc.internal.pageSize.getWidth() / 2, y + 4, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(44, 50, 44)
  doc.text(String(input.authorName || 'Nutricionista'), doc.internal.pageSize.getWidth() / 2, y + 10, { align: 'center' })
  if (input.authorCrn) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(107, 115, 104)
    doc.text(`CRN ${input.authorCrn}`, doc.internal.pageSize.getWidth() / 2, y + 14, { align: 'center' })
  }

  drawFooters(doc, {
    logoAsset,
    authorLine: input.authorCrn
      ? `${input.authorName || 'Nutricionista'} — CRN ${input.authorCrn}`
      : (input.authorName || 'Nutricionista'),
  })

  return doc
}

export async function downloadDocumentoPdf(input = {}) {
  const doc = await buildDocumentoPdf(input)
  const filename = `${sanitizeFilename(input.title || input.patientName)}.pdf`
  doc.save(filename)
  return filename
}

export async function openDocumentoPdfInNewTab(input = {}) {
  const doc = await buildDocumentoPdf(input)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
