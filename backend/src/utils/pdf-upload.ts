import multer from "multer";
import { acceptByExtensionOrMime } from "./upload-file-filter";

const PDF_EXTENSION = /\.pdf$/i;

export function createPdfUpload(options?: { fileSizeMb?: number }) {
  const fileSizeMb = options?.fileSizeMb ?? 20;

  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: fileSizeMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (acceptByExtensionOrMime(file, {
        extensionPattern: PDF_EXTENSION,
        allowedMimes: new Set(["application/pdf"]),
      })) {
        return cb(null, true);
      }
      cb(new Error("Envie apenas arquivos PDF."));
    },
  });
}
