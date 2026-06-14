import { execFile } from "child_process";
import fs from "fs";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const PDF_EXTENSIONS = /\.pdf$/i;

export function isPdfFilename(filename: string): boolean {
  return PDF_EXTENSIONS.test(String(filename || ""));
}

async function commandExists(command: string): Promise<boolean> {
  try {
    if (process.platform === "win32") {
      await execFileAsync("where", [command]);
    } else {
      await execFileAsync("which", [command]);
    }
    return true;
  } catch {
    return false;
  }
}

export async function isPdfCompressionAvailable(): Promise<boolean> {
  return commandExists("gs");
}

type PdfQuality = "ebook" | "screen";

export async function compressPdfFile(
  inputPath: string,
  outputPath: string,
  quality: PdfQuality = "ebook",
): Promise<{ inputBytes: number; outputBytes: number }> {
  const inputStats = await fs.promises.stat(inputPath);
  const settings = quality === "screen" ? "/screen" : "/ebook";

  await execFileAsync("gs", [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    `-dPDFSETTINGS=${settings}`,
    "-dNOPAUSE",
    "-dQUIET",
    "-dBATCH",
    `-sOutputFile=${outputPath}`,
    inputPath,
  ]);

  const outputStats = await fs.promises.stat(outputPath);
  return {
    inputBytes: inputStats.size,
    outputBytes: outputStats.size,
  };
}

export async function preparePdfForUpload(
  inputPath: string,
  targetMaxBytes: number,
): Promise<{ uploadPath: string; compressed: boolean; cleanupPaths: string[] }> {
  const cleanupPaths: string[] = [];
  const stats = await fs.promises.stat(inputPath);

  if (stats.size <= targetMaxBytes) {
    return { uploadPath: inputPath, compressed: false, cleanupPaths };
  }

  if (!(await isPdfCompressionAvailable())) {
    throw new Error(
      `PDF com ${(stats.size / (1024 * 1024)).toFixed(1)} MB excede o limite do Cloudinary e o compressor (Ghostscript) não está instalado no servidor.`,
    );
  }

  const ebookPath = `${inputPath}.ebook.pdf`;
  cleanupPaths.push(ebookPath);

  let result = await compressPdfFile(inputPath, ebookPath, "ebook");
  console.log(
    `[PDF] Compressão /ebook: ${(result.inputBytes / (1024 * 1024)).toFixed(2)}MB → ${(result.outputBytes / (1024 * 1024)).toFixed(2)}MB`,
  );

  if (result.outputBytes <= targetMaxBytes) {
    return { uploadPath: ebookPath, compressed: true, cleanupPaths };
  }

  const screenPath = `${inputPath}.screen.pdf`;
  cleanupPaths.push(screenPath);

  result = await compressPdfFile(inputPath, screenPath, "screen");
  console.log(
    `[PDF] Compressão /screen: ${(result.inputBytes / (1024 * 1024)).toFixed(2)}MB → ${(result.outputBytes / (1024 * 1024)).toFixed(2)}MB`,
  );

  if (result.outputBytes <= targetMaxBytes) {
    return { uploadPath: screenPath, compressed: true, cleanupPaths };
  }

  throw new Error(
    `Não foi possível reduzir o PDF para menos de ${(targetMaxBytes / (1024 * 1024)).toFixed(0)} MB. Divida o arquivo ou use uma versão mais leve.`,
  );
}
