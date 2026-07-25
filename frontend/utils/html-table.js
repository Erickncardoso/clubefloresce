/** Utilitários compartilhados para tabelas HTML (editor → preview → PDF). */

export function normalizeCellText(value) {
  if (value == null) return ''
  if (typeof value === 'string') {
    return value.replace(/\s+/g, ' ').trim()
  }
  if (typeof value.textContent === 'string') {
    return String(value.textContent || '').replace(/\s+/g, ' ').trim()
  }
  return ''
}

/**
 * Converte linhas de células (com colspan/rowspan) em payload para jspdf-autotable.
 * @param {{ cells: { content: string, colSpan?: number, rowSpan?: number, isHeader?: boolean }[] }[]} rows
 */
export function buildAutoTableDataFromRows(rows = []) {
  if (!rows.length) return { head: [], body: [] }

  const matrix = []

  for (let rIdx = 0; rIdx < rows.length; rIdx += 1) {
    const htmlRow = rows[rIdx]
    if (!matrix[rIdx]) matrix[rIdx] = []

    let colIdx = 0
    for (const cell of htmlRow.cells || []) {
      while (matrix[rIdx][colIdx] === 'SKIP') colIdx += 1

      const colSpan = Math.max(1, Number(cell.colSpan) || 1)
      const rowSpan = Math.max(1, Number(cell.rowSpan) || 1)
      const cellData = {
        content: normalizeCellText(cell.content),
        colSpan,
        rowSpan,
        isHeader: Boolean(cell.isHeader),
      }
      matrix[rIdx][colIdx] = cellData

      for (let dr = 0; dr < rowSpan; dr += 1) {
        for (let dc = 0; dc < colSpan; dc += 1) {
          if (dr === 0 && dc === 0) continue
          const rr = rIdx + dr
          const cc = colIdx + dc
          if (!matrix[rr]) matrix[rr] = []
          matrix[rr][cc] = 'SKIP'
        }
      }
      colIdx += colSpan
    }
  }

  const toAutoRow = (row = []) => {
    const out = []
    for (let c = 0; c < row.length; c += 1) {
      const cell = row[c]
      if (cell === 'SKIP' || cell == null) continue
      const item = { content: cell.content || '' }
      if (cell.colSpan > 1) item.colSpan = cell.colSpan
      if (cell.rowSpan > 1) item.rowSpan = cell.rowSpan
      out.push(item)
    }
    return out
  }

  const autotableRows = matrix.map(toAutoRow).filter((row) => row.some((cell) => String(cell.content || '').trim()))
  if (!autotableRows.length) return { head: [], body: [] }

  const firstRowCells = (rows[0]?.cells || []).filter(Boolean)
  const allHeader = firstRowCells.length > 0 && firstRowCells.every((cell) => cell.isHeader)

  if (allHeader && autotableRows.length > 1) {
    return {
      head: [autotableRows[0].map((cell) => cell.content || '')],
      body: autotableRows.slice(1),
    }
  }

  return { head: [], body: autotableRows }
}

export function parseTableElement(tableEl) {
  if (!tableEl?.rows) return { head: [], body: [] }
  const rows = [...tableEl.rows].map((row) => ({
    cells: [...row.cells].map((cell) => ({
      content: normalizeCellText(cell),
      colSpan: cell.colSpan || 1,
      rowSpan: cell.rowSpan || 1,
      isHeader: cell.tagName?.toLowerCase() === 'th',
    })),
  }))
  return buildAutoTableDataFromRows(rows)
}

export function tablePlainTextLines(tableEl) {
  const { head, body } = parseTableElement(tableEl)
  const lines = []
  if (head.length) {
    lines.push(head[0].join(' | '))
  }
  for (const row of body) {
    const cells = row.map((cell) => (typeof cell === 'string' ? cell : cell.content || ''))
    if (cells.some(Boolean)) lines.push(cells.join(' | '))
  }
  return lines
}

/** Substitui blocos `<table>` por texto legível antes de strip de tags. */
export function replaceHtmlTablesWithPlainText(html) {
  const value = String(html || '')
  if (!/<table[\s>]/i.test(value)) return value

  return value.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
    const rows = [...tableHtml.matchAll(/<tr[\s>][\s\S]*?<\/tr>/gi)].map((match) => {
      const cells = [...match[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cellMatch) =>
        normalizeCellText(
          cellMatch[1]
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<[^>]+>/g, ' '),
        ),
      )
      return cells.filter(Boolean).join(' | ')
    }).filter(Boolean)

    if (!rows.length) return ''
    return `<p>${rows.join('</p><p>')}</p>`
  })
}

export function htmlToPlainTextWithTables(html) {
  const value = String(html || '')
  if (!value.trim()) return ''

  const withTables = replaceHtmlTablesWithPlainText(value)
  return withTables
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}
