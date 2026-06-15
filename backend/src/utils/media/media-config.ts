export type MediaProvider = "cloudinary" | "bunny";

function readProvider(value: string | undefined, fallback: MediaProvider): MediaProvider {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "bunny") return "bunny";
  if (normalized === "cloudinary") return "cloudinary";
  return fallback;
}

export function getVideoUploadProvider(): MediaProvider {
  return readProvider(process.env.MEDIA_VIDEO_PROVIDER, "cloudinary");
}

export function getDocumentUploadProvider(): MediaProvider {
  return readProvider(process.env.MEDIA_DOCUMENT_PROVIDER, "cloudinary");
}

export function getDocumentUploadMaxBytes(): number {
  const explicit = Number(process.env.DOCUMENT_UPLOAD_MAX_MB);
  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit * 1024 * 1024;
  }
  return getDocumentUploadProvider() === "bunny"
    ? 100 * 1024 * 1024
    : 40 * 1024 * 1024;
}

export function isVideoDirectUploadEnabled(): boolean {
  return getVideoUploadProvider() === "cloudinary";
}
