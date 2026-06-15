import {
  getBunnyStreamApiKey,
  getBunnyStreamCdnHostname,
  getBunnyStreamLibraryId,
  isBunnyStreamConfigured,
  isBunnyStreamUrl,
  parseBunnyStreamVideoId,
} from "./bunny-config";
import { cacheService } from "../../services/cache.service";

const BUNNY_METADATA_CACHE_PREFIX = "bunny:video-metadata:";
const DEFAULT_METADATA_CACHE_TTL_SECONDS = Number(
  process.env.BUNNY_METADATA_CACHE_TTL_SECONDS || 6 * 60 * 60,
);

function bunnyMetadataCacheKey(videoId: string): string {
  return `${BUNNY_METADATA_CACHE_PREFIX}${videoId}`;
}

function getBunnyMetadataCacheTtlSeconds(): number {
  const ttl = DEFAULT_METADATA_CACHE_TTL_SECONDS;
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 6 * 60 * 60;
}

export async function invalidateBunnyVideoPlayMetadataCache(videoId: string): Promise<void> {
  const normalized = String(videoId || "").trim();
  if (!normalized || !cacheService.isReady()) return;
  await cacheService.del(bunnyMetadataCacheKey(normalized));
}

export type BunnyPlayChapter = {
  title: string;
  start: number;
  end: number;
};

export type BunnyVideoPlayMetadata = {
  provider: "bunny";
  videoId: string;
  cdnHost: string;
  length: number;
  thumbnailCount: number;
  width: number;
  height: number;
  thumbnailUrl: string;
  previewUrl: string;
  seekSpriteBaseUrl: string;
  seekPath?: string | null;
  chapters: BunnyPlayChapter[];
};

type BunnyChapterModel = {
  title?: string;
  start?: number;
  end?: number;
};

type BunnyVideoMetadataModel = {
  guid?: string;
  length?: number;
  thumbnailCount?: number;
  width?: number;
  height?: number;
  chapters?: BunnyChapterModel[] | null;
};

type BunnyVideoPlayDataModel = {
  seekPath?: string | null;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  video?: BunnyVideoMetadataModel | null;
};

function estimateBunnyThumbnailCount(length: number): number {
  if (length <= 0) return 0;
  if (length < 10) return Math.max(1, Math.ceil(length));
  return Math.max(1, Math.ceil(length / 2));
}

async function fetchBunnyVideoPlayData(videoId: string): Promise<BunnyVideoPlayDataModel | null> {
  if (!isBunnyStreamConfigured()) return null;

  const libraryId = getBunnyStreamLibraryId();
  const apiKey = getBunnyStreamApiKey();

  try {
    const response = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}/play`,
      { headers: { AccessKey: apiKey } },
    );

    if (!response.ok) return null;
    return await response.json() as BunnyVideoPlayDataModel;
  } catch {
    return null;
  }
}

async function fetchBunnyVideoMetadata(videoId: string): Promise<BunnyVideoMetadataModel | null> {
  if (!isBunnyStreamConfigured()) return null;

  const libraryId = getBunnyStreamLibraryId();
  const apiKey = getBunnyStreamApiKey();

  try {
    const response = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
      { headers: { AccessKey: apiKey } },
    );

    if (!response.ok) return null;
    return await response.json() as BunnyVideoMetadataModel;
  } catch {
    return null;
  }
}

function normalizeChapters(
  chapters: BunnyChapterModel[] | null | undefined,
  videoLength: number,
): BunnyPlayChapter[] {
  const normalized = (chapters || [])
    .map((chapter) => {
      const title = String(chapter.title || "").trim();
      const start = Number(chapter.start);
      const end = Number(chapter.end);
      if (!title || !Number.isFinite(start) || start < 0) return null;
      return {
        title,
        start,
        end: Number.isFinite(end) && end > start ? end : Math.max(start + 1, videoLength),
      };
    })
    .filter((chapter): chapter is BunnyPlayChapter => Boolean(chapter))
    .sort((a, b) => a.start - b.start);

  return normalized;
}

export async function fetchBunnyVideoPlayMetadata(
  videoUrl: string,
): Promise<BunnyVideoPlayMetadata | null> {
  if (!videoUrl || !isBunnyStreamUrl(videoUrl)) return null;

  const videoId = parseBunnyStreamVideoId(videoUrl);
  if (!videoId) return null;

  const cacheKey = bunnyMetadataCacheKey(videoId);
  const cached = await cacheService.getJson<BunnyVideoPlayMetadata>(cacheKey);
  if (cached?.videoId === videoId) {
    return cached;
  }

  const metadata = await fetchBunnyVideoPlayMetadataFromApi(videoId);
  if (metadata) {
    await cacheService.setJson(cacheKey, metadata, getBunnyMetadataCacheTtlSeconds());
  }

  return metadata;
}

async function fetchBunnyVideoPlayMetadataFromApi(
  videoId: string,
): Promise<BunnyVideoPlayMetadata | null> {
  const video = await fetchBunnyVideoMetadata(videoId);
  const playData = await fetchBunnyVideoPlayData(videoId);
  const playVideo = playData?.video || video;
  if (!playVideo && !playData) return null;

  const cdnHost = getBunnyStreamCdnHostname();
  const length = Math.max(0, Number(playVideo?.length || video?.length) || 0);
  const apiThumbnailCount = Math.max(0, Number(playVideo?.thumbnailCount || video?.thumbnailCount) || 0);
  const thumbnailCount = apiThumbnailCount || estimateBunnyThumbnailCount(length);
  const width = Math.max(0, Number(playVideo?.width || video?.width) || 0);
  const height = Math.max(0, Number(playVideo?.height || video?.height) || 0);
  const seekPath = playData?.seekPath || null;

  return {
    provider: "bunny",
    videoId,
    cdnHost,
    length,
    thumbnailCount,
    width,
    height,
    thumbnailUrl: playData?.thumbnailUrl || `https://${cdnHost}/${videoId}/thumbnail.jpg`,
    previewUrl: playData?.previewUrl || `https://${cdnHost}/${videoId}/preview.webp`,
    seekSpriteBaseUrl: `https://${cdnHost}/${videoId}/seek`,
    seekPath,
    chapters: normalizeChapters(playVideo?.chapters || video?.chapters, length),
  };
}
