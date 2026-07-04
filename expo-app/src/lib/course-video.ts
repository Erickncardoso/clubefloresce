import {
  buildBunnyStreamMp4FromParts,
  getBunnyStreamMp4Url,
  isBunnyCdnHost,
  isBunnyStreamVideoUrl,
} from '@/lib/bunny-video';
import { applyCloudinaryVideoQuality, isCloudinaryVideoUrl } from '@/lib/cloudinary-video';
import { resolveMediaUrl } from '@/lib/media-url';

const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function extractYoutubeId(url?: string | null): string | null {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]{11})/i,
    /youtu\.be\/([\w-]{11})/i,
    /youtube\.com\/embed\/([\w-]{11})/i,
    /youtube\.com\/shorts\/([\w-]{11})/i,
  ];
  for (const pattern of patterns) {
    const match = String(url).match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function getLessonVideoUrl(lesson?: Record<string, unknown> | null): string {
  if (!lesson || typeof lesson !== 'object') return '';
  return String(
    lesson.videoUrl
    || lesson.video_url
    || lesson.video
    || lesson.videoURL
    || lesson.fileUrl
    || lesson.file_url
    || lesson.mediaUrl
    || lesson.media_url
    || lesson.secure_url
    || lesson.urlVideo
    || lesson.videoLink
    || lesson.url
    || lesson.link
    || (lesson.media as Record<string, unknown> | undefined)?.url
    || (lesson.media as Record<string, unknown> | undefined)?.secure_url
    || '',
  ).trim();
}

export function resolveLessonPlaybackUrl(rawUrl?: string | null): string {
  const value = resolveMediaUrl(String(rawUrl || '').trim());
  if (!value) return '';

  const youtubeId = extractYoutubeId(value);
  if (youtubeId) return value;

  if (isCloudinaryVideoUrl(value)) {
    return applyCloudinaryVideoQuality(value, '720p');
  }

  if (isBunnyStreamVideoUrl(value) || isBunnyCdnHost(value)) {
    return getBunnyStreamMp4Url(value);
  }

  if (UUID_RE.test(value)) {
    return value;
  }

  if (/\.m3u8(?:\?|$)/i.test(value)) {
    return value;
  }

  return value;
}

export function buildPlaybackUrlFromMetadata(metadata?: {
  cdnHost?: string;
  videoId?: string;
} | null): string {
  if (!metadata?.cdnHost || !metadata?.videoId) return '';
  return buildBunnyStreamMp4FromParts(metadata.cdnHost, metadata.videoId);
}

export function getYoutubeEmbedUri(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1`;
}

export function getDirectVideoHtml(url: string): string {
  const safe = url.replace(/"/g, '&quot;');
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000;
  }
</style></head>
<body>
  <video src="${safe}" controls playsinline webkit-playsinline preload="metadata"></video>
</body></html>`;
}

export function getPdfViewerHtml(url: string, title = 'E-book'): string {
  const safe = url.replace(/"/g, '&quot;');
  const safeTitle = title.replace(/</g, '&lt;');
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
<title>${safeTitle}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #f4f1ea; }
  iframe, embed, object {
    width: 100%;
    height: 100%;
    border: 0;
    background: #fff;
  }
</style></head>
<body>
  <iframe src="${safe}" title="${safeTitle}" allow="fullscreen"></iframe>
</body></html>`;
}
