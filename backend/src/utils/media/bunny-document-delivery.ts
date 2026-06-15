import jwt from "jsonwebtoken";
import {
  getBunnyStorageCdnHostname,
  isBunnyStorageUrl,
} from "./bunny-config";
import { getDocumentUploadProvider } from "./media-config";

const DOCUMENT_TOKEN_TTL = "2h";

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

export function parseBunnyStoragePathFromUrl(fileUrl: string): string | null {
  const value = String(fileUrl || "").trim();
  if (!value) return null;

  if (value.includes("/api/upload/document")) {
    try {
      const url = new URL(value, getBackendPublicBaseUrl());
      const token = url.searchParams.get("token");
      if (token) {
        const payload = verifyDocumentAccessToken(token);
        return payload?.path || null;
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
    return pathname || null;
  } catch {
    return null;
  }
}

export function buildDocumentSignedUrl(
  storagePath: string,
  userId?: string | null,
): string {
  const normalized = String(storagePath || "").trim().replace(/^\/+/, "");
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

  return `${getBackendPublicBaseUrl()}/api/upload/document?token=${encodeURIComponent(token)}`;
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
