import fs from "fs";
import {
  buildBunnyStreamHlsUrl,
  getBunnyStreamApiKey,
  getBunnyStreamCollectionId,
  getBunnyStreamLibraryId,
  isBunnyStreamConfigured,
} from "./bunny-config";

type BunnyVideoModel = {
  guid?: string;
  title?: string;
  status?: number;
  encodeProgress?: number;
};

function sanitizeTitle(title: string): string {
  const value = String(title || "Aula").trim();
  return value || "Aula";
}

async function createBunnyVideo(title: string): Promise<BunnyVideoModel> {
  const libraryId = getBunnyStreamLibraryId();
  const apiKey = getBunnyStreamApiKey();
  const collectionId = getBunnyStreamCollectionId();

  const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: sanitizeTitle(title),
      ...(collectionId ? { collectionId } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Falha ao criar vídeo no Bunny Stream (${response.status}).`);
  }

  const data = await response.json() as BunnyVideoModel;
  if (!data?.guid) {
    throw new Error("Bunny Stream não retornou o ID do vídeo.");
  }
  return data;
}

async function uploadBunnyVideoFile(videoGuid: string, filePath: string): Promise<void> {
  const libraryId = getBunnyStreamLibraryId();
  const apiKey = getBunnyStreamApiKey();
  const fileBuffer = await fs.promises.readFile(filePath);

  const response = await fetch(
    `https://video.bunnycdn.com/library/${libraryId}/videos/${videoGuid}`,
    {
      method: "PUT",
      headers: {
        AccessKey: apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: fileBuffer,
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Falha ao enviar vídeo para Bunny Stream (${response.status}).`);
  }
}

export type BunnyVideoUploadResult = {
  url: string;
  videoId: string;
  provider: "bunny";
  publicId: string;
  transcriptionStatus: "pending";
  encodeProgress: number;
  status: number;
};

export async function bunnyVideoUploadFromPath(
  filePath: string,
  originalFilename: string,
): Promise<BunnyVideoUploadResult> {
  if (!isBunnyStreamConfigured()) {
    throw new Error(
      "Bunny Stream não configurado. Defina BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_API_KEY e BUNNY_STREAM_CDN_HOSTNAME.",
    );
  }

  const title = originalFilename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Aula";
  const created = await createBunnyVideo(title);
  await uploadBunnyVideoFile(created.guid as string, filePath);

  const videoId = created.guid as string;
  return {
    url: buildBunnyStreamHlsUrl(videoId),
    videoId,
    provider: "bunny",
    publicId: videoId,
    transcriptionStatus: "pending",
    encodeProgress: created.encodeProgress ?? 0,
    status: created.status ?? 1,
  };
}

export function getBunnyVideoUploadConfig() {
  return {
    provider: "bunny" as const,
    directUpload: false,
    libraryId: getBunnyStreamLibraryId(),
    cdnHostname: process.env.BUNNY_STREAM_CDN_HOSTNAME || "",
  };
}
