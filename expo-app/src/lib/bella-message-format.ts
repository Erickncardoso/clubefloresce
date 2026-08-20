/** Formatação de mensagens da Bella — espelha `frontend2/utils/bella-message-format.js`. */

export type BellaAttachment = {
  type: string;
  fileName: string;
  url: string | null;
};

export type BellaInlinePart =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string };

export type BellaContentBlock =
  | { type: 'heading'; level: 2 | 3; text: string; parts: BellaInlinePart[]; classification?: boolean }
  | { type: 'paragraph'; text: string; parts: BellaInlinePart[] }
  | { type: 'list'; ordered: boolean; items: Array<{ text: string; parts: BellaInlinePart[] }> };

type ChatMessageLike = {
  content?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function getMessageAttachment(msg?: ChatMessageLike | null): BellaAttachment | null {
  const attachment = msg?.metadata?.attachment as Record<string, unknown> | undefined;
  if (!attachment) return null;
  return {
    type: String(attachment.type || 'image'),
    fileName: String(attachment.fileName || ''),
    url: attachment.url ? String(attachment.url) : null,
  };
}

export function getMessageDisplayText(msg?: ChatMessageLike | null): string {
  const content = msg?.content?.trim() || '';
  if (!content) return '';

  const stripped = content
    .replace(/^📷\s*\[Imagem:[^\]]+\]\s*/i, '')
    .replace(/^📄\s*\[PDF:[^\]]+\]\s*/i, '')
    .trim();

  return stripped || content;
}

const AUTO_IMAGE_FALLBACKS = new Set([
  'Analise este PDF, por favor.',
  'Analise meu prato para registrar no diário de hoje.',
  'Analise este rótulo, por favor.',
  'Analise este rótulo e classifique o consumo (Verde, Amarelo ou Vermelho).',
  'Qual a melhor opção para mim neste cardápio?',
  'Analise esta imagem, por favor.',
  'Extraia os alimentos deste cupom e vincule à base de alimentos.',
]);

const AUTO_IMAGE_FALLBACK_RE =
  /^Analise meu .+ para registrar no diário de hoje\.?$/i;

export function shouldShowUserMessageText(msg?: ChatMessageLike | null): boolean {
  const text = getMessageDisplayText(msg);
  if (!text) return false;
  if (!getMessageAttachment(msg)?.url) return true;
  if (AUTO_IMAGE_FALLBACK_RE.test(text)) return false;
  return !AUTO_IMAGE_FALLBACKS.has(text);
}

export function getUserMessageImageUrl(msg?: ChatMessageLike | null): string | null {
  const attachment = getMessageAttachment(msg);
  return attachment?.type === 'image' && attachment.url ? attachment.url : null;
}

function parseInline(text: string): BellaInlinePart[] {
  const parts: BellaInlinePart[] = [];
  const source = String(text);
  // **bold** e _italic_ (notas de estimativa da Bella)
  const re = /(\*\*(.+?)\*\*|_(.+?)_)/g;
  let last = 0;
  let match = re.exec(source);
  while (match) {
    if (match.index > last) {
      parts.push({ kind: 'text', text: source.slice(last, match.index) });
    }
    if (match[2]) {
      parts.push({ kind: 'bold', text: match[2] });
    } else if (match[3]) {
      parts.push({ kind: 'text', text: match[3] });
    }
    last = match.index + match[0].length;
    match = re.exec(source);
  }
  if (last < source.length) {
    parts.push({ kind: 'text', text: source.slice(last) });
  }
  return parts.length ? parts : [{ kind: 'text', text: source }];
}

function normalizeLabelReply(content: string) {
  let text = String(content)
    .replace(/^##\s*Semáforo\s*$/gim, '## Classificação do consumo')
    .replace(/^##\s*Semafoto\s*$/gim, '## Classificação do consumo');

  const dropSections = [
    'Produto',
    'Ingredientes',
    'Grau de processamento',
    'Porção e calorias',
    'Nutrientes de atenção',
    'Pontos positivos',
    'Pontos de atenção',
  ];

  for (const section of dropSections) {
    const pattern = new RegExp(`^##\\s*${section}[\\s\\S]*?(?=^##\\s|$)`, 'gim');
    text = text.replace(pattern, '');
  }

  return text.trim();
}

/** Converte markdown leve da Bella em blocos tipados para React Native. */
export function parseBellaMarkdown(content?: string | null): BellaContentBlock[] {
  if (!content?.trim()) return [];

  const normalized = normalizeLabelReply(content)
    .replace(/\r\n/g, '\n')
    .replace(/(\d+\.\s+[A-Za-zÀ-ú])/g, '\n\n$1')
    .replace(/\s-\s(?=[A-Za-zÀ-ú])/g, '\n- ');

  const lines = normalized.split('\n');
  const blocks: BellaContentBlock[] = [];
  let listOrdered: boolean | null = null;
  let listItems: Array<{ text: string; parts: BellaInlinePart[] }> = [];

  const flushList = () => {
    if (!listItems.length || listOrdered == null) return;
    blocks.push({ type: 'list', ordered: listOrdered, items: listItems });
    listItems = [];
    listOrdered = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      const text = line.slice(3);
      blocks.push({
        type: 'heading',
        level: 2,
        text,
        parts: parseInline(text),
        classification: text === 'Classificação do consumo' || text === 'Semáforo',
      });
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      const text = line.slice(4);
      blocks.push({ type: 'heading', level: 3, text, parts: parseInline(text) });
      continue;
    }

    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      if (listOrdered != null && listOrdered !== true) flushList();
      listOrdered = true;
      listItems.push({ text: numbered[1], parts: parseInline(numbered[1]) });
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('• ')) {
      if (listOrdered != null && listOrdered !== false) flushList();
      listOrdered = false;
      const text = line.replace(/^[-•]\s+/, '');
      listItems.push({ text, parts: parseInline(text) });
      continue;
    }

    flushList();
    blocks.push({ type: 'paragraph', text: line, parts: parseInline(line) });
  }

  flushList();
  return blocks;
}

export function patchUserMessageAttachment<T extends ChatMessageLike>(
  msg: T,
  fallbackUrl: string,
): T {
  if (!msg || !fallbackUrl) return msg;
  const attachment = getMessageAttachment(msg);
  const current = attachment?.url || '';
  // Já tem URL remota estável — não sobrescrever com file:// local.
  if (current.startsWith('http') && !fallbackUrl.startsWith('http')) return msg;

  return {
    ...msg,
    metadata: {
      ...(msg.metadata || {}),
      taskType: msg.metadata?.taskType || 'image',
      attachment: {
        type: 'image',
        fileName: attachment?.fileName || 'foto.jpg',
        url: fallbackUrl.startsWith('http') ? fallbackUrl : current.startsWith('http') ? current : fallbackUrl,
      },
    },
  };
}

export function mergeUserMessageResponse<T extends ChatMessageLike>(
  tempMsg: T,
  serverMsg: T | null | undefined,
  localPreviewUrl?: string | null,
): T {
  if (!serverMsg) {
    return localPreviewUrl ? patchUserMessageAttachment(tempMsg, localPreviewUrl) : tempMsg;
  }

  let merged: T = { ...serverMsg };
  if (!merged.content?.trim() && tempMsg.content?.trim()) {
    merged = { ...merged, content: tempMsg.content };
  }

  const tempImageUrl = getUserMessageImageUrl(tempMsg) || localPreviewUrl || null;
  const serverImageUrl = getUserMessageImageUrl(merged);

  if (serverImageUrl?.startsWith('http')) {
    return patchUserMessageAttachment(merged, serverImageUrl);
  }
  if (tempImageUrl) {
    return patchUserMessageAttachment(merged, tempImageUrl);
  }

  return merged;
}
