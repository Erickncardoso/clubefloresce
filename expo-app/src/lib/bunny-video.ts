const BUNNY_STREAM_HOST_PATTERN = /\.b-cdn\.net\//i;
const BUNNY_HLS_PATTERN = /\/playlist\.m3u8(?:\?|$)/i;
const BUNNY_MP4_PATTERN = /\/play_\d+p\.mp4(?:\?|$)/i;

export function isBunnyStreamVideoUrl(videoUrl?: string | null): boolean {
  if (!videoUrl) return false;
  if (!BUNNY_STREAM_HOST_PATTERN.test(videoUrl)) return false;
  return BUNNY_HLS_PATTERN.test(videoUrl) || BUNNY_MP4_PATTERN.test(videoUrl) || /\/[a-f0-9-]{36}(?:\?|$|\/)/i.test(videoUrl);
}

export function isBunnyCdnHost(videoUrl?: string | null): boolean {
  return Boolean(videoUrl && BUNNY_STREAM_HOST_PATTERN.test(videoUrl));
}

export function parseBunnyStreamVideoId(videoUrl?: string | null): string | null {
  if (!videoUrl || !BUNNY_STREAM_HOST_PATTERN.test(videoUrl)) return null;
  try {
    const pathname = new URL(videoUrl).pathname;
    const parts = pathname.split('/').filter(Boolean);
    if (!parts.length) return null;
    const last = parts[parts.length - 1];
    if (last === 'playlist.m3u8' || /^play_\d+p\.mp4$/i.test(last)) {
      return parts[parts.length - 2] || null;
    }
    if (/^[a-f0-9-]{36}$/i.test(last)) return last;
    return parts[0] || null;
  } catch {
    return null;
  }
}

export function getBunnyStreamHlsUrl(videoUrl: string): string {
  if (!videoUrl) return '';
  if (BUNNY_HLS_PATTERN.test(videoUrl)) return videoUrl;

  const videoId = parseBunnyStreamVideoId(videoUrl)
    || videoUrl.replace(/^https?:\/\//, '').split('/').filter(Boolean)[0];
  if (!videoId) return videoUrl;

  try {
    const host = new URL(videoUrl).host;
    return `https://${host}/${videoId}/playlist.m3u8`;
  } catch {
    return videoUrl;
  }
}

export function getBunnyStreamMp4Url(videoUrl: string, height = 720): string {
  const videoId = parseBunnyStreamVideoId(videoUrl);
  if (!videoId) return videoUrl;
  try {
    const host = new URL(videoUrl).host;
    return `https://${host}/${videoId}/play_${height}p.mp4`;
  } catch {
    return videoUrl;
  }
}

export function buildBunnyStreamMp4FromParts(cdnHost: string, videoId: string, height = 720): string {
  const host = String(cdnHost || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const id = String(videoId || '').trim();
  if (!host || !id) return '';
  return `https://${host}/${id}/play_${height}p.mp4`;
}
