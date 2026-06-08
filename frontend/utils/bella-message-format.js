function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineFormat(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

export function getMessageAttachment(msg) {
  const attachment = msg?.metadata?.attachment
  if (!attachment) return null
  return {
    type: attachment.type || 'image',
    fileName: attachment.fileName || '',
    url: attachment.url || null,
  }
}

export function getMessageDisplayText(msg) {
  const content = msg?.content?.trim() || ''
  if (!content) return ''

  const stripped = content
    .replace(/^📷\s*\[Imagem:[^\]]+\]\s*/i, '')
    .replace(/^📄\s*\[PDF:[^\]]+\]\s*/i, '')
    .trim()

  return stripped || content
}

const AUTO_IMAGE_FALLBACKS = new Set([
  'Analise este PDF, por favor.',
  'Analise meu prato, por favor.',
  'Analise este rótulo, por favor.',
  'Analise esta imagem, por favor.',
])

export function shouldShowUserMessageText(msg) {
  const text = getMessageDisplayText(msg)
  if (!text) return false
  if (!getMessageAttachment(msg)) return true
  return !AUTO_IMAGE_FALLBACKS.has(text)
}

export function getUserMessageImageUrl(msg) {
  const attachment = getMessageAttachment(msg)
  return attachment?.type === 'image' && attachment.url ? attachment.url : null
}

export function formatBellaMarkdown(content) {
  if (!content?.trim()) return ''

  const normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/(\d+\.\s+[A-Za-zÀ-ú])/g, '\n\n$1')
    .replace(/\s-\s(?=[A-Za-zÀ-ú])/g, '\n- ')

  const lines = normalized.split('\n')
  const parts = []
  let listType = null
  let listItems = []

  const flushList = () => {
    if (!listItems.length) return
    const tag = listType === 'ol' ? 'ol' : 'ul'
    parts.push(`<${tag}>${listItems.map((item) => `<li>${inlineFormat(item)}</li>`).join('')}</${tag}>`)
    listItems = []
    listType = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushList()
      continue
    }

    if (line.startsWith('## ')) {
      flushList()
      parts.push(`<h3 class="bella-md-h">${inlineFormat(line.slice(3))}</h3>`)
      continue
    }

    if (line.startsWith('### ')) {
      flushList()
      parts.push(`<h4 class="bella-md-sub">${inlineFormat(line.slice(4))}</h4>`)
      continue
    }

    const numbered = line.match(/^\d+\.\s+(.+)$/)
    if (numbered) {
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(numbered[1])
      continue
    }

    if (line.startsWith('- ') || line.startsWith('• ')) {
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(line.replace(/^[-•]\s+/, ''))
      continue
    }

    flushList()
    parts.push(`<p>${inlineFormat(line)}</p>`)
  }

  flushList()
  return parts.join('')
}
