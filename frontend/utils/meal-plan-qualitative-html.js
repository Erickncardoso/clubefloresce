/** Converte HTML do editor qualitativo em texto plano para parse/publicação. */
export function htmlToQualitativeText(html) {
  const value = String(html || '')
  if (!value.trim()) return ''

  let text = value
    .replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
      const rows = [...tableHtml.matchAll(/<tr[\s>][\s\S]*?<\/tr>/gi)].map((match) => {
        const cells = [...match[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cellMatch) =>
          String(cellMatch[1] || '')
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim(),
        )
        return cells.filter(Boolean).join(' | ')
      }).filter(Boolean)
      return rows.length ? `\n${rows.join('\n')}\n` : ''
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, '\t')
    .replace(/<\/th>/gi, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")

  return text
    .split('\n')
    .map((line) => line.replace(/\t+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Converte texto plano legado em HTML simples para o editor rico. */
export function textToQualitativeHtml(text) {
  const value = String(text || '').trim()
  if (!value) return ''

  return value
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean)
      if (!lines.length) return ''
      if (lines.length === 1) return `<p>${escapeHtml(lines[0])}</p>`
      return `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
    })
    .filter(Boolean)
    .join('')
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Garante editorHtml e editorText sincronizados antes de salvar/publicar. */
export function syncQualitativeEditorContent(form) {
  if (!form || form.methodology !== 'qualitative') return form
  const html = String(form.editorHtml || '').trim()
  const text = String(form.editorText || '').trim()

  if (html) {
    form.editorText = htmlToQualitativeText(html)
  } else if (text && !html) {
    form.editorHtml = textToQualitativeHtml(text)
    form.editorText = text
  } else {
    form.editorText = ''
    form.editorHtml = ''
  }
  return form
}

export function qualitativeContentPreview(form, maxLength = 140) {
  const text = String(form?.editorText || htmlToQualitativeText(form?.editorHtml) || '').trim()
  if (!text) return 'Editor vazio — comece a prescrever.'
  const oneLine = text.replace(/\s+/g, ' ')
  return oneLine.length > maxLength ? `${oneLine.slice(0, maxLength)}…` : oneLine
}

export function hasQualitativeContent(form) {
  return Boolean(
    String(form?.editorHtml || '').replace(/<[^>]+>/g, '').trim()
    || String(form?.editorText || '').trim(),
  )
}
