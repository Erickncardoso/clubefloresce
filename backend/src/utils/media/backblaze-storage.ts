import {
  getBackblazeB2ApplicationKey,
  getBackblazeB2BucketId,
  getBackblazeB2BucketName,
  getBackblazeB2KeyId,
  getBackblazeB2PublicBaseUrl,
  isBackblazeB2Configured,
} from "./backblaze-config";

type B2Auth = {
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
  expiresAt: number;
};

let cachedAuth: B2Auth | null = null;

const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "application/pdf": "pdf",
};

export function guessExtensionFromMime(mimeType?: string | null): string {
  const mime = String(mimeType || "").trim().toLowerCase();
  if (MIME_EXTENSION[mime]) return MIME_EXTENSION[mime];
  if (mime.startsWith("image/")) return mime.split("/")[1] || "jpg";
  if (mime.startsWith("video/")) return mime.split("/")[1] || "mp4";
  if (mime.startsWith("audio/")) return mime.split("/")[1] || "ogg";
  return "bin";
}

async function authorizeB2(): Promise<B2Auth> {
  if (cachedAuth && cachedAuth.expiresAt > Date.now()) return cachedAuth;

  const keyId = getBackblazeB2KeyId();
  const appKey = getBackblazeB2ApplicationKey();
  const credentials = Buffer.from(`${keyId}:${appKey}`).toString("base64");

  const res = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    headers: { Authorization: `Basic ${credentials}` },
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Falha ao autorizar Backblaze B2 (${res.status}).`);
  }

  cachedAuth = {
    authorizationToken: String(data.authorizationToken || ""),
    apiUrl: String(data.apiUrl || "").replace(/\/+$/, ""),
    downloadUrl: String(data.downloadUrl || "").replace(/\/+$/, ""),
    expiresAt: Date.now() + 22 * 60 * 60 * 1000,
  };
  return cachedAuth;
}

function buildPublicFileUrl(downloadUrl: string, bucketName: string, storageKey: string): string {
  const customBase = getBackblazeB2PublicBaseUrl();
  const encodedKey = storageKey.split("/").map(encodeURIComponent).join("/");
  // CDN / domínio próprio — não é URL nativa do B2
  if (customBase && !customBase.includes("backblazeb2.com")) {
    return `${customBase}/${encodedKey}`;
  }
  // URL nativa B2: usa downloadUrl da sessão (pod correto, ex. f005)
  return `${downloadUrl}/file/${bucketName}/${encodedKey}`;
}

export type BackblazeUploadResult = {
  storageKey: string;
  publicUrl: string;
  sizeBytes: number;
  mimeType: string;
};

export async function uploadBufferToBackblazeB2(
  storageKey: string,
  body: Buffer,
  mimeType = "application/octet-stream",
): Promise<BackblazeUploadResult> {
  if (!isBackblazeB2Configured()) {
    throw new Error("Backblaze B2 não configurado.");
  }

  const auth = await authorizeB2();
  const bucketId = getBackblazeB2BucketId();
  const bucketName = getBackblazeB2BucketName();

  const uploadUrlRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: "POST",
    headers: {
      Authorization: auth.authorizationToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bucketId }),
  });
  const uploadUrlData: any = await uploadUrlRes.json().catch(() => ({}));
  if (!uploadUrlRes.ok) {
    throw new Error(uploadUrlData?.message || `Falha ao obter upload URL B2 (${uploadUrlRes.status}).`);
  }

  const uploadUrl = String(uploadUrlData.uploadUrl || "");
  const uploadAuth = String(uploadUrlData.authorizationToken || "");
  const sha1 = await import("crypto").then((crypto) =>
    crypto.createHash("sha1").update(body).digest("hex"),
  );

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: uploadAuth,
      "X-Bz-File-Name": storageKey.split("/").map((part) => encodeURIComponent(part)).join("/"),
      "Content-Type": mimeType,
      "Content-Length": String(body.length),
      "X-Bz-Content-Sha1": sha1,
    },
    body,
  });
  const uploadData: any = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) {
    throw new Error(uploadData?.message || `Falha no upload B2 (${uploadRes.status}).`);
  }

  const publicUrl = buildPublicFileUrl(auth.downloadUrl, bucketName, storageKey);
  return {
    storageKey,
    publicUrl,
    sizeBytes: body.length,
    mimeType,
  };
}

export async function downloadRemoteFile(url: string, timeoutMs = 45000): Promise<{
  body: Buffer;
  mimeType: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Falha ao baixar mídia remota (${res.status}).`);
    }
    const body = Buffer.from(await res.arrayBuffer());
    const mimeType = String(res.headers.get("content-type") || "application/octet-stream").split(";")[0].trim();
    return { body, mimeType };
  } finally {
    clearTimeout(timer);
  }
}
