import jwt from "jsonwebtoken";
import {
  getBunnyStorageCdnHostname,
  isBunnyStorageUrl,
} from "./bunny-config";
import { getDocumentUploadProvider } from "./media-config";

const DOCUMENT_TOKEN_TTL = "2h";
const DOCUMENT_API_PATH = "/api/upload/document";

type DocumentTokenPayload = {
  kind: "document";
  path: string;
};

export function getBackendPublicBaseUrl(): string {
  const configured = String(
    process.env.BACKEND_PUBLIC_URL
    || process.env.API_PUBLIC_URL
    || "",
  ).trim().replace(/\/$/, "");

  if (configured) return configured;

  const port = String(process.env.PORT || 3001).trim();
  return `http://localhost:${port}`;
}

export function shouldDeliverDocumentsViaProxy(): boolean {
  if (getDocumentUploadProvider() !== "bunny") return false;
  return process.env.BUNNY_STORAGE_USE_CDN !== "true";
}

/** Caminho real no Bunny (espaços decodificados, sem %20 literais). */
export function normalizeBunnyStoragePath(storagePath: string): string {
  const trimmed = String(storagePath || "").trim().replace(/^\/+/, "");
  if (!trimmed) return "";

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function decodeDocumentPathFromToken(token: string): string | null {
  const verified = verifyDocumentAccessToken(token);
  if (verified?.path) return normalizeBunnyStoragePath(verified.path);

  try {
    const decoded = jwt.decode(token) as DocumentTokenPayload | null;
    if (decoded?.kind === "document" && decoded.path) {
      return normalizeBunnyStoragePath(decoded.path);
    }
  } catch {
    /* ignora */
  }

  return null;
}

export function parseBunnyStoragePathFromUrl(fileUrl: string): string | null {
  const value = String(fileUrl || "").trim();
  if (!value) return null;

  if (value.includes("/upload/document")) {
    try {
      const url = new URL(value, getBackendPublicBaseUrl());
      const token = url.searchParams.get("token");
      if (token) {
        const path = decodeDocumentPathFromToken(token);
        if (path) return path;
      }
    } catch {
      /* ignora */
    }
  }

  if (!isBunnyStorageUrl(value) && !/\.b-cdn\.net\//i.test(value)) {
    return null;
  }

  try {
    const pathname = new URL(value).pathname.replace(/^\/+/, "");
    return pathname ? normalizeBunnyStoragePath(pathname) : null;
  } catch {
    return null;
  }
}

/** URL permanente para gravar no banco (CDN Bunny), nunca link assinado temporário. */
export function normalizeStoredDocumentUrl(fileUrl: string | null | undefined): string {
  const value = String(fileUrl || "").trim();
  if (!value) return "";

  const storagePath = parseBunnyStoragePathFromUrl(value);
  if (storagePath && shouldDeliverDocumentsViaProxy()) {
    const host = getBunnyStorageCdnHostname();
    if (host) {
      return `https://${host}/${storagePath}`;
    }
  }

  return value;
}

export function buildDocumentSignedUrl(
  storagePath: string,
  userId?: string | null,
): string {
  const normalized = normalizeBunnyStoragePath(storagePath);
  if (!normalized) return "";

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não configurado para assinar URLs de documento.");
  }

  const token = jwt.sign(
    {
      kind: "document",
      path: normalized,
      sub: userId || undefined,
    } satisfies DocumentTokenPayload & { sub?: string },
    secret,
    { expiresIn: DOCUMENT_TOKEN_TTL },
  );

  return `${DOCUMENT_API_PATH}?token=${encodeURIComponent(token)}`;
}

export function verifyDocumentAccessToken(token: string): DocumentTokenPayload | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || !token) return null;

  try {
    const payload = jwt.verify(token, secret) as DocumentTokenPayload & { sub?: string };
    if (payload?.kind !== "document" || !payload.path) return null;
    return { kind: "document", path: payload.path };
  } catch {
    return null;
  }
}

export function resolveDocumentDeliveryUrl(
  fileUrl: string | null | undefined,
  userId?: string | null,
): string {
  const value = String(fileUrl || "").trim();
  if (!value) return "";

  if (!shouldDeliverDocumentsViaProxy()) {
    return value;
  }

  const storagePath = parseBunnyStoragePathFromUrl(value);
  if (!storagePath) return value;

  return buildDocumentSignedUrl(storagePath, userId);
}

export function isBrokenBunnyCdnUrl(fileUrl: string): boolean {
  const cdnHost = getBunnyStorageCdnHostname();
  return Boolean(cdnHost && fileUrl.includes(cdnHost));
}
