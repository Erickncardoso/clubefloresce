import { PDFParse } from "pdf-parse";

const MAX_PDF_CHARS = 14_000;

export interface PdfExtractResult {
  text: string;
  pages: number;
  truncated: boolean;
  fileName: string;
}

export async function extractPdfText(buffer: Buffer, fileName: string): Promise<PdfExtractResult> {
  if (!buffer?.length) {
    throw new Error("Arquivo PDF vazio ou inválido.");
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const raw = result.text?.replace(/\s+/g, " ").trim() || "";
    const pages = result.total || result.pages?.length || 0;

    if (!raw) {
      throw new Error(
        "Este PDF parece ser escaneado (sem texto selecionável). Tire uma foto das páginas e envie pela opção de imagem.",
      );
    }

    const truncated = raw.length > MAX_PDF_CHARS;
    const text = truncated
      ? `${raw.slice(0, MAX_PDF_CHARS)}\n\n[... conteúdo truncado por limite de tamanho ...]`
      : raw;

    return { text, pages, truncated, fileName };
  } catch (err) {
    if (err instanceof Error && err.message.includes("escaneado")) throw err;
    throw new Error("Não foi possível ler o PDF. Verifique se o arquivo não está corrompido.");
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
