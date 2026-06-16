import fs from "fs";
import path from "path";
import {
  buildBunnyStoragePublicUrl,
  getBunnyStorageApiHost,
  getBunnyStorageApiKey,
  getBunnyStorageZoneName,
  isBunnyStorageConfigured,
} from "./bunny-config";
import { normalizeBunnyStoragePath } from "./bunny-document-delivery";

function sanitizeFileName(fileName: string): string {
  const base = path.basename(String(fileName || "document"));
  const cleaned = base.replace(/[^\w.\-() ]+/g, "_").trim();
  return cleaned || "document";
}

function buildStoragePath(originalFilename: string): string {
  const safeName = sanitizeFileName(originalFilename);
  const folder = String(process.env.BUNNY_STORAGE_DOCUMENTS_PREFIX || "ebooks").replace(/^\/+|\/+$/g, "");
  const stamp = Date.now();
  return `${folder}/${stamp}-${safeName}`;
}

async function readUploadBody(input: Buffer | string): Promise<Buffer> {
  if (Buffer.isBuffer(input)) return input;
  return fs.promises.readFile(input);
}

export type BunnyDocumentUploadResult = {
  url: string;
  storagePath: string;
  provider: "bunny";
  compressed: boolean;
};

export async function bunnyDocumentUpload(
  input: Buffer | string,
  originalFilename: string,
): Promise<BunnyDocumentUploadResult> {
  if (!isBunnyStorageConfigured()) {
    throw new Error(
      "Bunny Storage não configurado. Defina BUNNY_STORAGE_ZONE_NAME, BUNNY_STORAGE_API_KEY e BUNNY_STORAGE_CDN_HOSTNAME.",
    );
  }

  const zone = getBunnyStorageZoneName();
  const apiKey = getBunnyStorageApiKey();
  const apiHost = getBunnyStorageApiHost();
  const storagePath = buildStoragePath(originalFilename);
  const fileName = path.posix.basename(storagePath);
  const directory = path.posix.dirname(storagePath);
  const encodedPath = directory === "."
    ? encodeURIComponent(fileName)
    : `${directory.split("/").map((part) => encodeURIComponent(part)).join("/")}/${encodeURIComponent(fileName)}`;

  const body = await readUploadBody(input);
  const uploadUrl = `https://${apiHost}/${zone}/${encodedPath}`;

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/octet-stream",
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Falha ao enviar documento para Bunny Storage (${response.status}).`);
  }

  return {
    url: buildBunnyStoragePublicUrl(storagePath),
    storagePath,
    provider: "bunny",
    compressed: false,
  };
}

export async function downloadBunnyStorageFile(storagePath: string): Promise<{
  body: Buffer;
  contentType: string;
}> {
  if (!isBunnyStorageConfigured()) {
    throw new Error("Bunny Storage não configurado.");
  }

  const zone = getBunnyStorageZoneName();
  const apiKey = getBunnyStorageApiKey();
  const apiHost = getBunnyStorageApiHost();
  const normalized = normalizeBunnyStoragePath(storagePath);
  if (!normalized || normalized.includes("..")) {
    throw new Error("Caminho de documento inválido.");
  }

  const encodedPath = normalized
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const downloadUrl = `https://${apiHost}/${zone}/${encodedPath}`;

  const response = await fetch(downloadUrl, {
    headers: { AccessKey: apiKey },
  });

  if (!response.ok) {
    throw new Error(`Documento não encontrado no Bunny Storage (${response.status}).`);
  }

  const body = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type")
    || (normalized.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream");

  return { body, contentType };
}
