/** Helpers de formatação para os componentes PatientChart* */

export function formatCpfMask(value?: string | null): string {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function formatCepMask(value?: string | null): string {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function formatWeek(dateStr?: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date?: string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateShort(value?: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatPhoneDisplay(phone?: string | null): string {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return '—'
  if (digits.length === 13 && digits.startsWith('55')) {
    const local = digits.slice(2)
    return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }
  if (digits.length === 11) {
    return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  return phone || '—'
}

export function buildWhatsappUrl(phone?: string | null): string {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${withCountry}`
}

function waEscapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function waFormatPlainSegment(s: string): string {
  let t = waEscapeHtml(s)
  // Bold: *text*
  t = t.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
  // Italic: _text_
  t = t.replace(/_([^_\n]+)_/g, '<em>$1</em>')
  // Strikethrough: ~text~
  t = t.replace(/~([^~\n]+)~/g, '<s>$1</s>')
  // Line breaks
  t = t.replace(/\n/g, '<br/>')
  return t
}

export function formatWhatsappTextForDisplay(raw?: string | null): string {
  const s = String(raw || '')
  if (!s) return ''
  const segments = s.split('```')
  const parts: string[] = []
  for (let i = 0; i < segments.length; i++) {
    if (i % 2 === 1) {
      parts.push(
        `<pre class="wa-pre"><code>${waEscapeHtml(segments[i].replace(/^\n|\n$/g, ''))}</code></pre>`,
      )
    } else {
      parts.push(waFormatPlainSegment(segments[i]))
    }
  }
  return parts.join('')
}
