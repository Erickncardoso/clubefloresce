import fs from "fs";
import os from "os";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { isPdfFilename, preparePdfForUpload } from "./pdf-compress";

dotenv.config();

const CLOUDINARY_API_TIMEOUT_MS = Number(process.env.CLOUDINARY_API_TIMEOUT_MS || 30 * 60 * 1000);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: CLOUDINARY_API_TIMEOUT_MS,
});

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET,
  );
}

function assertCloudinaryConfigured(): void {
  if (isCloudinaryConfigured()) return;
  throw new Error(
    "Cloudinary não configurado no servidor. Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no backend (Coolify/apiclube).",
  );
}

type CloudinaryResourceType = "image" | "video" | "raw" | "auto";
type CloudinaryUploadResult = {
  secure_url?: string | null;
  public_id?: string;
  version?: number;
  done?: boolean;
};

type CloudinaryUploadOptions = {
  resourceType?: CloudinaryResourceType;
  fileSizeBytes?: number;
  originalFilename?: string;
  errorKind?: "video" | "document" | "image";
};

export type CloudinaryVideoUploadResult = {
  url: string;
  publicId: string;
  version?: number;
  transcriptionStatus: "pending" | "disabled";
};

export type CloudinaryVideoUploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadUrl: string;
};

export const VIDEO_UPLOAD_FOLDER = "clube-video-lessons";
const LARGE_VIDEO_BYTES = 100 * 1024 * 1024;
/** Margem abaixo do limite típico do Cloudinary Plus (20 MB). */
export const CLOUDINARY_DOC_TARGET_MAX_BYTES = Number(
  process.env.CLOUDINARY_DOC_TARGET_MAX_BYTES || 18 * 1024 * 1024,
);
const LARGE_DOCUMENT_BYTES = 10 * 1024 * 1024;

function formatCloudinaryError(error: any, kind: "video" | "document" | "image" = "image"): string {
  const message = error?.message || error?.error?.message || String(error || "");
  console.error("[Cloudinary] Erro bruto:", message);
  if (/ECONNRESET|ECONNREFUSED|EPIPE|socket hang up/i.test(message)) {
    return "Conexão com o Cloudinary interrompida. Tente novamente em alguns segundos.";
  }
  if (/413|too large|file size|payload|maximum.*size/i.test(message)) {
    if (kind === "video") {
      return "Vídeo muito grande para o plano Cloudinary atual. Reduza o tamanho ou aumente o limite na conta.";
    }
    if (kind === "document") {
      return "Documento muito grande para o plano Cloudinary. O servidor tentará comprimir automaticamente — tente novamente.";
    }
    return "Arquivo muito grande. Reduza o tamanho ou tente novamente.";
  }
  if (/timeout|timed out/i.test(message)) {
    return "O upload excedeu o tempo limite. Tente novamente com uma conexão mais estável.";
  }
  return message || "Erro ao enviar arquivo para o Cloudinary.";
}

async function withCloudinaryRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const message = String((error as any)?.message || "");
      const retriable = /ECONNRESET|ECONNREFUSED|EPIPE|socket hang up|timeout|timed out/i.test(message);
      if (!retriable || attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw lastError;
}

async function removeTempFile(filePath?: string | null): Promise<void> {
  if (!filePath) return;
  await fs.promises.unlink(filePath).catch(() => undefined);
}

export function createVideoUploadSignature(
  folder: string = VIDEO_UPLOAD_FOLDER,
): CloudinaryVideoUploadSignature {
  assertCloudinaryConfigured();
  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET as string,
  );

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME as string;
  return {
    cloudName,
    apiKey: process.env.CLOUDINARY_API_KEY as string,
    timestamp,
    signature,
    folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
  };
}

function uploadLargeFromPath(
  filePath: string,
  options: Record<string, unknown>,
): Promise<CloudinaryUploadResult> {
  return withCloudinaryRetry(() => new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(
      filePath,
      {
        chunk_size: 6 * 1024 * 1024,
        timeout: CLOUDINARY_API_TIMEOUT_MS,
        ...options,
      } as any,
      (error: any, result: CloudinaryUploadResult | undefined) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result?.secure_url && result?.done === false) {
          return;
        }
        resolve(result || {});
      },
    );
  }));
}

function uploadLargeVideoFromPath(filePath: string, folder: string): Promise<string> {
  return uploadLargeFromPath(filePath, {
    resource_type: "video",
    folder,
  }).then((result) => {
    if (!result?.secure_url) {
      throw new Error("Cloudinary não retornou secure_url para o vídeo.");
    }
    return result.secure_url as string;
  });
}

export const cloudinaryUpload = async (
  fileBuffer: Buffer,
  folder: string = "clube-nutricional",
  options?: CloudinaryUploadOptions,
): Promise<string> => {
  try {
    assertCloudinaryConfigured();
    const resourceType: CloudinaryResourceType = options?.resourceType || "auto";

    const uploadOptions: Record<string, unknown> = {
      folder,
      resource_type: resourceType,
    };

    if (resourceType === "raw" && options?.originalFilename) {
      uploadOptions.use_filename = true;
      uploadOptions.unique_filename = true;
      uploadOptions.filename_override = options.originalFilename;
    }

    const result = await withCloudinaryRetry(() => new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions as any,
        (error: any, response: CloudinaryUploadResult | undefined) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(response || {});
        },
      );

      stream.on("error", reject);
      stream.end(fileBuffer);
    }));

    if (!result?.secure_url) {
      throw new Error("Cloudinary não retornou secure_url para o arquivo.");
    }

    return result.secure_url as string;
  } catch (error: any) {
    const detail = formatCloudinaryError(error, options?.errorKind || (
      options?.resourceType === "video" ? "video"
        : options?.resourceType === "raw" ? "document"
          : "image"
    ));
    console.error("Cloudinary upload error:", detail);
    if (!isCloudinaryConfigured()) {
      throw new Error(
        "Cloudinary não configurado no servidor. Atualize as variáveis CLOUDINARY_* no deploy do backend.",
      );
    }
    throw new Error(detail);
  }
};

export async function cloudinaryDocumentUpload(
  fileBuffer: Buffer,
  folder: string = "clube-documents",
  originalFilename: string,
): Promise<{ url: string; compressed: boolean }> {
  assertCloudinaryConfigured();

  const safeName = originalFilename.replace(/[^\w.\-]+/g, "_");
  const inputPath = path.join(os.tmpdir(), `clube-doc-${Date.now()}-${safeName}`);
  const cleanupPaths: string[] = [inputPath];
  let uploadPath = inputPath;
  let compressed = false;

  try {
    await fs.promises.writeFile(inputPath, fileBuffer);

    if (isPdfFilename(originalFilename)) {
      const prepared = await preparePdfForUpload(inputPath, CLOUDINARY_DOC_TARGET_MAX_BYTES);
      uploadPath = prepared.uploadPath;
      compressed = prepared.compressed;
      cleanupPaths.push(...prepared.cleanupPaths);
    }

    const stats = await fs.promises.stat(uploadPath);
    const isPdf = isPdfFilename(originalFilename);
    const resourceType: CloudinaryResourceType = isPdf ? "image" : "raw";

    const uploadOptions: Record<string, unknown> = {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      filename_override: originalFilename,
    };

    const result = stats.size > LARGE_DOCUMENT_BYTES
      ? await uploadLargeFromPath(uploadPath, uploadOptions)
      : await withCloudinaryRetry(() => new Promise<CloudinaryUploadResult>((resolve, reject) => {
        cloudinary.uploader.upload(
          uploadPath,
          {
            ...uploadOptions,
            timeout: CLOUDINARY_API_TIMEOUT_MS,
          } as any,
          (error: any, response: CloudinaryUploadResult | undefined) => {
            if (error) reject(error);
            else resolve(response || {});
          },
        );
      }));

    if (!result?.secure_url) {
      throw new Error("Cloudinary não retornou secure_url para o documento.");
    }

    return { url: result.secure_url as string, compressed };
  } catch (error: any) {
    const detail = formatCloudinaryError(error, "document");
    console.error("Cloudinary document upload error:", detail);
    throw new Error(detail);
  } finally {
    await Promise.all(cleanupPaths.map((filePath) => removeTempFile(filePath)));
  }
}

export const cloudinaryVideoUploadFromPath = async (
  filePath: string,
  folder: string = VIDEO_UPLOAD_FOLDER,
): Promise<CloudinaryVideoUploadResult> => {
  try {
    assertCloudinaryConfigured();
    const stats = await fs.promises.stat(filePath);
    const fileSizeBytes = stats.size;

    const url = fileSizeBytes > LARGE_VIDEO_BYTES
      ? await uploadLargeVideoFromPath(filePath, folder)
      : await cloudinaryUpload(await fs.promises.readFile(filePath), folder, {
          resourceType: "video",
          fileSizeBytes,
          errorKind: "video",
        });

    const ref = parseCloudinaryVideoUrl(url);
    return {
      url,
      publicId: ref?.publicId || "",
      version: ref?.version,
      transcriptionStatus: "disabled",
    };
  } catch (error: any) {
    const detail = formatCloudinaryError(error, "video");
    console.error("Cloudinary video upload error:", detail);
    throw new Error(detail);
  }
};

export const cloudinaryVideoUpload = async (
  fileBuffer: Buffer,
  folder: string = VIDEO_UPLOAD_FOLDER,
  options?: Omit<CloudinaryUploadOptions, "resourceType">,
): Promise<CloudinaryVideoUploadResult> => {
  const url = await cloudinaryUpload(fileBuffer, folder, {
    ...options,
    resourceType: "video",
    errorKind: "video",
  });

  const ref = parseCloudinaryVideoUrl(url);
  if (!ref) {
    return {
      url,
      publicId: "",
      transcriptionStatus: "disabled",
    };
  }

  return {
    url,
    publicId: ref.publicId,
    version: ref.version,
    transcriptionStatus: "disabled",
  };
};

function parseCloudinaryVideoUrl(videoUrl: string): { publicId: string; version?: number } | null {
  if (!videoUrl.includes("res.cloudinary.com")) return null;
  try {
    const parts = new URL(videoUrl).pathname.split("/").filter(Boolean);
    const uploadIdx = parts.indexOf("upload");
    if (uploadIdx === -1) return null;
    let cursor = uploadIdx + 1;
    let version: number | undefined;
    if (parts[cursor]?.startsWith("v")) {
      version = Number(parts[cursor].slice(1));
      cursor += 1;
    }
    const publicId = parts.slice(cursor).join("/").replace(/\.[^/.]+$/, "");
    return publicId ? { publicId, version } : null;
  } catch {
    return null;
  }
}
