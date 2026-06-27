import { readEnv } from "../env";

/** Backblaze B2 — também chamado de "Blackbase" no painel. */
export function isBackblazeB2Configured(): boolean {
  return Boolean(
    readEnv("BACKBLAZE_B2_KEY_ID")
    && readEnv("BACKBLAZE_B2_APPLICATION_KEY")
    && readEnv("BACKBLAZE_B2_BUCKET_ID")
    && readEnv("BACKBLAZE_B2_BUCKET_NAME"),
  );
}

export function getBackblazeB2KeyId(): string {
  const value = readEnv("BACKBLAZE_B2_KEY_ID");
  if (!value) throw new Error("BACKBLAZE_B2_KEY_ID não configurado.");
  return value;
}

export function getBackblazeB2ApplicationKey(): string {
  const value = readEnv("BACKBLAZE_B2_APPLICATION_KEY");
  if (!value) throw new Error("BACKBLAZE_B2_APPLICATION_KEY não configurado.");
  return value;
}

export function getBackblazeB2BucketId(): string {
  const value = readEnv("BACKBLAZE_B2_BUCKET_ID");
  if (!value) throw new Error("BACKBLAZE_B2_BUCKET_ID não configurado.");
  return value;
}

export function getBackblazeB2BucketName(): string {
  const value = readEnv("BACKBLAZE_B2_BUCKET_NAME");
  if (!value) throw new Error("BACKBLAZE_B2_BUCKET_NAME não configurado.");
  return value;
}

export function getBackblazeB2PublicBaseUrl(): string | null {
  const explicit = readEnv("BACKBLAZE_B2_PUBLIC_URL");
  if (explicit) return explicit.replace(/\/+$/, "");
  return null;
}

export function getWhatsappMediaStoragePrefix(): string {
  return String(readEnv("BACKBLAZE_B2_WHATSAPP_PREFIX") || "whatsapp").replace(/^\/+|\/+$/g, "");
}
