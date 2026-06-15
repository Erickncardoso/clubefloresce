import { cloudinaryDocumentUpload } from "../cloudinary";
import { getDocumentUploadProvider } from "./media-config";
import { bunnyDocumentUpload } from "./bunny-storage";
import { isBunnyStorageConfigured } from "./bunny-config";
import { isPdfFilename, preparePdfForUpload } from "../pdf-compress";
import fs from "fs";
import os from "os";
import path from "path";

const BUNNY_DOC_TARGET_MAX_BYTES = Number(
  process.env.BUNNY_DOC_TARGET_MAX_BYTES || 0,
);

async function removeTempFile(filePath?: string | null): Promise<void> {
  if (!filePath) return;
  await fs.promises.unlink(filePath).catch(() => undefined);
}

export async function uploadDocumentFromBuffer(
  fileBuffer: Buffer,
  originalFilename: string,
) {
  const provider = getDocumentUploadProvider();

  if (provider === "bunny") {
    if (!isBunnyStorageConfigured()) {
      throw new Error("Bunny Storage não configurado no servidor.");
    }

    let uploadBuffer = fileBuffer;
    const cleanupPaths: string[] = [];

    if (BUNNY_DOC_TARGET_MAX_BYTES > 0 && isPdfFilename(originalFilename) && fileBuffer.length > BUNNY_DOC_TARGET_MAX_BYTES) {
      const safeName = originalFilename.replace(/[^\w.\-]+/g, "_");
      const inputPath = path.join(os.tmpdir(), `clube-bunny-doc-${Date.now()}-${safeName}`);
      cleanupPaths.push(inputPath);
      await fs.promises.writeFile(inputPath, fileBuffer);
      const prepared = await preparePdfForUpload(inputPath, BUNNY_DOC_TARGET_MAX_BYTES);
      cleanupPaths.push(...prepared.cleanupPaths);
      uploadBuffer = await fs.promises.readFile(prepared.uploadPath);
      await Promise.all(cleanupPaths.map((filePath) => removeTempFile(filePath)));
      return {
        ...(await bunnyDocumentUpload(uploadBuffer, originalFilename)),
        compressed: prepared.compressed,
      };
    }

    return {
      ...(await bunnyDocumentUpload(uploadBuffer, originalFilename)),
      compressed: false,
    };
  }

  const result = await cloudinaryDocumentUpload(fileBuffer, "clube-documents", originalFilename);
  return {
    url: result.url,
    provider: "cloudinary" as const,
    compressed: result.compressed,
  };
}
