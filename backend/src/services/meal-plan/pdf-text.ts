import { extractPdfBlocks } from "../ai/pdf-block-reader";

export async function extractPdfRawText(buffer: Buffer): Promise<{
  text: string;
  pages: number;
  blocks: import("../ai/pdf-block-reader").PdfTextBlock[];
}> {
  const result = await extractPdfBlocks(buffer, "plano-alimentar.pdf");
  return {
    text: result.fullText,
    pages: result.pages,
    blocks: result.blocks,
  };
}
