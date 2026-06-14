import path from "path";

/** Safari/iOS costuma enviar mimetype vazio ou application/octet-stream. */
export function isLooseClientMime(mimetype: string): boolean {
  const mime = String(mimetype || "").toLowerCase().trim();
  return !mime || mime === "application/octet-stream";
}

export function hasAllowedExtension(filename: string, pattern: RegExp): boolean {
  return pattern.test(path.extname(filename).toLowerCase());
}

export function acceptByExtensionOrMime(
  file: Express.Multer.File,
  options: {
    extensionPattern: RegExp;
    allowedMimes?: Set<string>;
    allowMimePrefix?: string;
  },
): boolean {
  const extOk = hasAllowedExtension(file.originalname, options.extensionPattern);
  if (!extOk) return false;

  const mime = String(file.mimetype || "").toLowerCase().trim();
  if (isLooseClientMime(mime)) return true;
  if (options.allowedMimes?.has(mime)) return true;
  if (options.allowMimePrefix && mime.startsWith(options.allowMimePrefix)) return true;

  return false;
}
