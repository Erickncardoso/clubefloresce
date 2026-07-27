import {
  extractPdfBlocks,
  type PdfBlocksResult,
  type PdfTextBlock,
} from "../ai/pdf-block-reader";

export type { PdfBlocksResult, PdfTextBlock };

export interface PdfExtractResult {
  text: string;
  pages: number;
  truncated: boolean;
  fileName: string;
  blocks: PdfTextBlock[];
}

export async function extractPdfText(buffer: Buffer, fileName: string): Promise<PdfExtractResult> {
  const result = await extractPdfBlocks(buffer, fileName);
  return {
    text: result.fullText,
    pages: result.pages,
    truncated: result.truncated,
    fileName: result.fileName,
    blocks: result.blocks,
  };
}
