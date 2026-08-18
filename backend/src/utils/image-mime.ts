const HEIC_BRANDS = new Set(["heic", "heix", "heif", "hevc", "mif1", "msf1"]);

function isHeicBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.subarray(4, 8).toString("ascii") !== "ftyp") return false;
  return HEIC_BRANDS.has(buffer.subarray(8, 12).toString("ascii").toLowerCase());
}

/** Detecta o MIME real pelos magic bytes — iOS costuma mandar HEIC com nome .jpg. */
export function sniffImageMime(buffer: Buffer, declared = ""): string {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (buffer.length >= 6 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return "image/gif";
  }
  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString("ascii") === "RIFF"
    && buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  if (isHeicBuffer(buffer)) {
    throw new Error(
      "Esta foto está em HEIC. Tire de novo no app (JPEG) ou envie PNG/JPEG da galeria.",
    );
  }

  const mime = declared.toLowerCase().trim();
  if (mime === "image/jpg") return "image/jpeg";
  if (mime.startsWith("image/") && !mime.includes("heic") && !mime.includes("heif")) {
    return mime;
  }
  return "image/jpeg";
}
