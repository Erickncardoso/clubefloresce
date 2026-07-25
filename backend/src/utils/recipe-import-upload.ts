import multer from "multer";
import { acceptByExtensionOrMime, hasAllowedExtension } from "./upload-file-filter";

const PDF_EXTENSION = /\.pdf$/i;
const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

export function createRecipeImportUpload(options?: { fileSizeMb?: number }) {
  const fileSizeMb = options?.fileSizeMb ?? 15;

  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: fileSizeMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const mime = String(file.mimetype || "").split(";")[0].trim().toLowerCase();
      const isPdf = acceptByExtensionOrMime(file, {
        extensionPattern: PDF_EXTENSION,
        allowedMimes: new Set(["application/pdf"]),
      });
      const isImage =
        mime.startsWith("image/")
        || hasAllowedExtension(file.originalname, IMAGE_EXTENSION);

      if (isPdf || isImage) return cb(null, true);
      cb(new Error("Envie um PDF ou uma imagem (JPG, PNG, WEBP)."));
    },
  });
}
