import { PDFParse } from "pdf-parse";

/** Tamanho máximo por bloco enviado à IA (evita confundir modelos com PDFs longos). */
export const PDF_AI_BLOCK_CHARS = Number(process.env.PDF_AI_BLOCK_CHARS || 3500);
export const PDF_AI_BLOCK_OVERLAP = Number(process.env.PDF_AI_BLOCK_OVERLAP || 400);
export const PDF_MAX_BLOCKS = Number(process.env.PDF_MAX_BLOCKS || 24);

export interface PdfTextBlock {
  index: number;
  label: string;
  text: string;
  pageNumber?: number;
}

export interface PdfBlocksResult {
  blocks: PdfTextBlock[];
  pages: number;
  totalChars: number;
  truncated: boolean;
  fileName: string;
  fullText: string;
}

function normalizePdfText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}

function splitLongText(text: string, labelPrefix: string, pageNumber?: number): PdfTextBlock[] {
  const normalized = normalizePdfText(text);
  if (!normalized) return [];

  if (normalized.length <= PDF_AI_BLOCK_CHARS) {
    const label = pageNumber ? `Página ${pageNumber}` : `${labelPrefix} 1`;
    return [{ index: 0, label, text: normalized, pageNumber }];
  }

  const blocks: PdfTextBlock[] = [];
  let start = 0;
  let part = 1;

  while (start < normalized.length && blocks.length < PDF_MAX_BLOCKS) {
    const end = Math.min(normalized.length, start + PDF_AI_BLOCK_CHARS);
    const slice = normalized.slice(start, end);
    const label = pageNumber
      ? `Página ${pageNumber} (parte ${part})`
      : `${labelPrefix} ${part}`;

    blocks.push({
      index: blocks.length,
      label,
      text: slice,
      pageNumber,
    });

    if (end >= normalized.length) break;
    start = Math.max(0, end - PDF_AI_BLOCK_OVERLAP);
    part += 1;
  }

  return blocks;
}

export function splitPlainTextIntoBlocks(text: string, labelPrefix = "Trecho"): PdfTextBlock[] {
  const normalized = normalizePdfText(text);
  if (!normalized) return [];

  const blocks: PdfTextBlock[] = [];
  let start = 0;
  let part = 1;

  while (start < normalized.length && blocks.length < PDF_MAX_BLOCKS) {
    const end = Math.min(normalized.length, start + PDF_AI_BLOCK_CHARS);
    blocks.push({
      index: blocks.length,
      label: `${labelPrefix} ${part}`,
      text: normalized.slice(start, end),
    });
    if (end >= normalized.length) break;
    start = Math.max(0, end - PDF_AI_BLOCK_OVERLAP);
    part += 1;
  }

  return blocks;
}

export async function extractPdfBlocks(
  buffer: Buffer,
  fileName: string,
): Promise<PdfBlocksResult> {
  if (!buffer?.length) {
    throw new Error("Arquivo PDF vazio ou inválido.");
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const pages = result.total || result.pages?.length || 0;
    const pageTexts = Array.isArray(result.pages)
      ? result.pages
          .map((page: { text?: string }, index: number) => ({
            pageNumber: index + 1,
            text: normalizePdfText(String(page?.text || "")),
          }))
          .filter((page) => page.text)
      : [];

    let blocks: PdfTextBlock[] = [];

    if (pageTexts.length) {
      for (const page of pageTexts) {
        const pageBlocks = splitLongText(page.text, "Página", page.pageNumber);
        for (const block of pageBlocks) {
          blocks.push({ ...block, index: blocks.length });
        }
        if (blocks.length >= PDF_MAX_BLOCKS) break;
      }
    }

    const fullText = normalizePdfText(result.text || pageTexts.map((p) => p.text).join("\n\n"));

    if (!fullText && !blocks.length) {
      throw new Error(
        "Este PDF parece ser escaneado (sem texto selecionável). Tire uma foto das páginas ou envie o PDF exportado em texto.",
      );
    }

    if (!blocks.length) {
      blocks = splitPlainTextIntoBlocks(fullText, "Trecho");
    }

    const truncated =
      blocks.length >= PDF_MAX_BLOCKS
      || (pageTexts.length > 0 && pageTexts.length > blocks.length);

    return {
      blocks,
      pages,
      totalChars: fullText.length,
      truncated,
      fileName,
      fullText,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("escaneado")) throw err;
    throw new Error("Não foi possível ler o PDF. Verifique se o arquivo não está corrompido.");
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

export async function processPdfBlocksSequentially<T>(
  blocks: PdfTextBlock[],
  processor: (block: PdfTextBlock) => Promise<T>,
): Promise<T[]> {
  const results: T[] = [];
  for (const block of blocks) {
    results.push(await processor(block));
  }
  return results;
}

export function formatBlocksForPrompt(blocks: PdfTextBlock[]): string {
  return blocks
    .map((block) => `### ${block.label}\n${block.text}`)
    .join("\n\n");
}
