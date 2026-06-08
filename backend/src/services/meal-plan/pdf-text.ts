import { PDFParse } from "pdf-parse";

export async function extractPdfRawText(buffer: Buffer): Promise<{ text: string; pages: number }> {
  if (!buffer?.length) {
    throw new Error("Arquivo PDF vazio ou inválido.");
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const text = result.text?.replace(/\r\n/g, "\n").trim() || "";
    const pages = result.total || result.pages?.length || 0;

    if (!text) {
      throw new Error(
        "Este PDF parece ser escaneado (sem texto selecionável). Envie o PDF exportado pelo software da nutricionista.",
      );
    }

    return { text, pages };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
