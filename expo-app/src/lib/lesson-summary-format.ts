function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInlineMarkup(value: string) {
  return String(value || '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function isHeadingLine(line: string) {
  return /^#{1,2}\s+/.test(line) || /^Resumo da Aula:/i.test(line);
}

function parseHeading(line: string) {
  if (/^#{2}\s+/.test(line)) {
    return { level: 3, text: line.replace(/^##+\s*/, '').trim() };
  }
  if (/^#\s+/.test(line)) {
    return { level: 2, text: line.replace(/^#+\s*/, '').trim() };
  }
  if (/^Resumo da Aula:/i.test(line)) {
    return { level: 2, text: line.trim() };
  }
  return null;
}

export function formatLessonSummaryHtml(raw: string) {
  const text = String(raw || '').trim();
  if (!text) return '';

  const lines = text.split('\n');
  const parts: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (listType === 'ul') parts.push('</ul>');
    if (listType === 'ol') parts.push('</ol>');
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    const heading = parseHeading(trimmed);
    if (heading) {
      closeList();
      const tag = heading.level === 3 ? 'h3' : 'h2';
      const className = heading.level === 3 ? 'resumo-prose__subheading' : 'resumo-prose__heading';
      parts.push(
        `<${tag} class="${className}">${formatInlineMarkup(escapeHtml(heading.text))}</${tag}>`,
      );
      continue;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      if (listType !== 'ul') {
        closeList();
        parts.push('<ul class="resumo-prose__list">');
        listType = 'ul';
      }
      const item = trimmed.replace(/^[-*•]\s+/, '');
      parts.push(`<li>${formatInlineMarkup(escapeHtml(item))}</li>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (listType !== 'ol') {
        closeList();
        parts.push('<ol class="resumo-prose__list resumo-prose__list--numbered">');
        listType = 'ol';
      }
      const item = trimmed.replace(/^\d+\.\s+/, '');
      parts.push(`<li>${formatInlineMarkup(escapeHtml(item))}</li>`);
      continue;
    }

    if (/^Objetivos de Aprendizagem:?$/i.test(trimmed)) {
      closeList();
      parts.push(`<h3 class="resumo-prose__subheading">${escapeHtml(trimmed.replace(/:$/, ''))}</h3>`);
      continue;
    }

    closeList();
    parts.push(`<p class="resumo-prose__p">${formatInlineMarkup(escapeHtml(trimmed))}</p>`);
  }

  closeList();
  return parts.join('');
}

export const LESSON_SUMMARY_CSS = `
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .resumo-prose { color: #374151; font-size: 15px; line-height: 1.75; padding: 4px 2px; }
  .resumo-prose__heading { margin: 0 0 14px; font-size: 19px; font-weight: 800; line-height: 1.35; color: #8B967C; letter-spacing: -0.02em; }
  .resumo-prose__subheading { margin: 18px 0 10px; font-size: 16px; font-weight: 800; color: #1f2937; }
  .resumo-prose__p { margin: 0 0 14px; }
  .resumo-prose__list { margin: 6px 0 16px; padding: 0; list-style: none; display: grid; gap: 9px; }
  .resumo-prose__list li { position: relative; padding-left: 22px; color: #4b5563; }
  .resumo-prose__list li::before { content: ''; position: absolute; left: 0; top: 0.62em; width: 7px; height: 7px; border-radius: 999px; background: #8B967C; opacity: 0.85; }
  .resumo-prose strong { font-weight: 800; color: #1f2937; }
`;
