import {
  cloudinaryVideoUploadFromPath,
  createVideoUploadSignature,
  isCloudinaryConfigured,
} from "../cloudinary";
import { getVideoUploadProvider, isVideoDirectUploadEnabled } from "./media-config";
import { bunnyVideoUploadFromPath, getBunnyVideoUploadConfig } from "./bunny-stream";
import { isBunnyStreamConfigured } from "./bunny-config";

export async function getVideoUploadPreparation() {
  const provider = getVideoUploadProvider();

  if (provider === "bunny") {
    if (!isBunnyStreamConfigured()) {
      throw new Error("Bunny Stream não configurado no servidor.");
    }
    return getBunnyVideoUploadConfig();
  }

  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary não configurado no servidor.");
  }

  return {
    provider: "cloudinary" as const,
    directUpload: isVideoDirectUploadEnabled(),
    ...createVideoUploadSignature(),
  };
}

export async function uploadLessonVideoFromPath(filePath: string, originalFilename: string) {
  const provider = getVideoUploadProvider();

  if (provider === "bunny") {
    const result = await bunnyVideoUploadFromPath(filePath, originalFilename);
    return {
      url: result.url,
      publicId: result.publicId,
      version: undefined,
      transcriptionStatus: result.transcriptionStatus,
      provider: result.provider,
      videoId: result.videoId,
      encodeProgress: result.encodeProgress,
      status: result.status,
    };
  }

  const result = await cloudinaryVideoUploadFromPath(filePath);
  return {
    url: result.url,
    publicId: result.publicId,
    version: result.version,
    transcriptionStatus: result.transcriptionStatus,
    provider: "cloudinary" as const,
    videoId: result.publicId,
    encodeProgress: 100,
    status: 4,
  };
}
