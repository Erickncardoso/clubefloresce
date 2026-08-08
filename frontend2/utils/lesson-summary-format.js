function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatInlineMarkup(value) {
  return String(value || '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

function isHeadingLine(line) {
  return /^#{1,2}\s+/.test(line) || /^Resumo da Aula:/i.test(line)
}

function parseHeading(line) {
  if (/^#{2}\s+/.test(line)) {
    return { level: 3, text: line.replace(/^##+\s*/, '').trim() }
  }
  if (/^#\s+/.test(line)) {
    return { level: 2, text: line.replace(/^#+\s*/, '').trim() }
  }
  if (/^Resumo da Aula:/i.test(line)) {
    return { level: 2, text: line.trim() }
  }
  return null
}

export function formatLessonSummaryHtml(raw) {
  const text = String(raw || '').trim()
  if (!text) return ''

  const lines = text.split('\n')
  const parts = []
  let listType = null

  const closeList = () => {
    if (listType === 'ul') parts.push('</ul>')
    if (listType === 'ol') parts.push('</ol>')
    listType = null
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      closeList()
      continue
    }

    const heading = parseHeading(trimmed)
    if (heading) {
      closeList()
      const tag = heading.level === 3 ? 'h3' : 'h2'
      const className = heading.level === 3 ? 'resumo-prose__subheading' : 'resumo-prose__heading'
      parts.push(
        `<${tag} class="${className}">${formatInlineMarkup(escapeHtml(heading.text))}</${tag}>`,
      )
      continue
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      if (listType !== 'ul') {
        closeList()
        parts.push('<ul class="resumo-prose__list">')
        listType = 'ul'
      }
      const item = trimmed.replace(/^[-*•]\s+/, '')
      parts.push(`<li>${formatInlineMarkup(escapeHtml(item))}</li>`)
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (listType !== 'ol') {
        closeList()
        parts.push('<ol class="resumo-prose__list resumo-prose__list--numbered">')
        listType = 'ol'
      }
      const item = trimmed.replace(/^\d+\.\s+/, '')
      parts.push(`<li>${formatInlineMarkup(escapeHtml(item))}</li>`)
      continue
    }

    if (/^Objetivos de Aprendizagem:?$/i.test(trimmed)) {
      closeList()
      parts.push(`<h3 class="resumo-prose__subheading">${escapeHtml(trimmed.replace(/:$/, ''))}</h3>`)
      continue
    }

    closeList()
    parts.push(`<p class="resumo-prose__p">${formatInlineMarkup(escapeHtml(trimmed))}</p>`)
  }

  closeList()
  return parts.join('')
}

export function hasLessonSummaryContent(raw) {
  return Boolean(String(raw || '').trim())
}
