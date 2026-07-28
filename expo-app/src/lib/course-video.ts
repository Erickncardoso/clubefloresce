import {
  buildBunnyStreamMp4FromParts,
  buildBunnyStreamEmbedUrl,
  buildBunnyStreamHlsFromParts,
  getBunnyStreamHlsUrl,
  getBunnyStreamMp4Url,
  isBunnyCdnHost,
  isBunnyStreamVideoUrl,
  parseBunnyStreamVideoId,
} from '@/lib/bunny-video';
import { applyCloudinaryVideoQuality, getCloudinaryHlsUrl, isCloudinaryVideoUrl } from '@/lib/cloudinary-video';
import { getBunnyStreamLibraryId } from '@/config/env';
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

export function buildPlaybackHlsFromMetadata(metadata?: {
  cdnHost?: string;
  videoId?: string;
} | null): string {
  if (!metadata?.cdnHost || !metadata?.videoId) return '';
  return buildBunnyStreamHlsFromParts(metadata.cdnHost, metadata.videoId);
}

export function getYoutubeEmbedUri(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1`;
}

const VIDEO_TIME_BRIDGE_SCRIPT = `
function __cfPostTime(seconds) {
  var payload = { type: 'cf-video-time', seconds: Number(seconds) || 0 };
  try {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    if (window.parent && window.parent !== window) window.parent.postMessage(payload, '*');
  } catch (e) {}
}
window.__cfSeek = function (seconds) {
  var video = document.querySelector('video');
  if (video) video.currentTime = Number(seconds) || 0;
};
`;

function ensurePlayerJsParam(url: string): string {
  if (/[?&]playerjs=true(?:&|$)/i.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}playerjs=true`;
}

/** HTML wrapper com Player.js para embed Bunny (tempo + seek para anotações). */
export function getBunnyEmbedPlayerHtml(embedUrl: string): string {
  const safe = ensurePlayerJsParam(embedUrl).replace(/"/g, '&quot;');
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
  iframe { width: 100%; height: 100%; border: 0; display: block; background: #000; }
</style>
<script src="https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js"></script>
</head>
<body>
  <iframe id="bunny-player" src="${safe}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>
  <script>
    ${VIDEO_TIME_BRIDGE_SCRIPT}
    (function () {
      var player = new playerjs.Player(document.getElementById('bunny-player'));
      player.on('timeupdate', function (data) {
        __cfPostTime(data && data.seconds);
      });
      window.__cfSeek = function (seconds) {
        player.setCurrentTime(Number(seconds) || 0);
      };
    })();
  </script>
</body></html>`;
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
  <script>
    ${VIDEO_TIME_BRIDGE_SCRIPT}
    (function () {
      var video = document.querySelector('video');
      if (!video) return;
      video.addEventListener('timeupdate', function () { __cfPostTime(video.currentTime); });
    })();
  </script>
</body></html>`;
}

export function getHlsVideoHtml(url: string): string {
  const safe = url.replace(/"/g, '&quot;');
  const mp4Fallback = safe.replace(/\/playlist\.m3u8(?:\?.*)?$/i, '/play_720p.mp4');
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
  video { width: 100%; height: 100%; object-fit: contain; background: #000; }
</style>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js"></script>
</head>
<body>
  <video id="player" controls playsinline webkit-playsinline crossorigin="anonymous"></video>
  <script>
    ${VIDEO_TIME_BRIDGE_SCRIPT}
    (function () {
      var src = "${safe}";
      var mp4Fallback = "${mp4Fallback}";
      var video = document.getElementById('player');
      if (!video || !src) return;

      function tryMp4Fallback() {
        if (!mp4Fallback || mp4Fallback === src) return;
        video.removeAttribute('crossorigin');
        video.src = mp4Fallback;
      }

      if (window.Hls && window.Hls.isSupported()) {
        var hls = new window.Hls({ enableWorker: true });
        hls.on(window.Hls.Events.ERROR, function (_event, data) {
          if (data && data.fatal) {
            hls.destroy();
            tryMp4Fallback();
          }
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        return;
      }

      if (video.canPlayType('application/vnd.apple.mpegurl') === 'probably') {
        video.src = src;
        video.addEventListener('error', tryMp4Fallback, { once: true });
        return;
      }

      tryMp4Fallback();
      video.addEventListener('timeupdate', function () { __cfPostTime(video.currentTime); });
    })();
  </script>
</body></html>`;
}

export function resolveLessonPlayerSource(
  rawUrl?: string | null,
  resolvedUrl?: string | null,
  bunnyMetadata?: {
    cdnHost?: string;
    videoId?: string;
    libraryId?: string;
    embedUrl?: string;
  } | null,
) {
  const raw = resolveMediaUrl(String(rawUrl || '').trim());
  const resolved = resolveMediaUrl(String(resolvedUrl || '').trim());
  const source = resolved || raw;

  const youtubeId = extractYoutubeId(source) || extractYoutubeId(raw);
  if (youtubeId) {
    return { kind: 'youtube' as const, youtubeId };
  }

  const bunnyCandidate = [source, raw].find(
    (url) => isBunnyStreamVideoUrl(url) || isBunnyCdnHost(url),
  );
  const bunnyVideoId = bunnyMetadata?.videoId
    || parseBunnyStreamVideoId(bunnyCandidate || '')
    || parseBunnyStreamVideoId(source)
    || parseBunnyStreamVideoId(raw);

  if (bunnyVideoId || bunnyCandidate || bunnyMetadata?.videoId) {
    const embedUrl = bunnyMetadata?.embedUrl
      || buildBunnyStreamEmbedUrl(
        bunnyMetadata?.libraryId || getBunnyStreamLibraryId(),
        bunnyVideoId || '',
      );
    if (embedUrl) {
      return { kind: 'bunny-embed' as const, url: embedUrl };
    }
  }

  if (!source) {
    return { kind: 'empty' as const, url: '' };
  }

  const cloudinaryCandidate = [source, raw].find((url) => isCloudinaryVideoUrl(url));
  if (cloudinaryCandidate) {
    const hlsUrl = getCloudinaryHlsUrl(cloudinaryCandidate);
    if (hlsUrl) return { kind: 'hls' as const, url: hlsUrl };
  }

  if (/\.m3u8(?:\?|$)/i.test(source)) {
    return { kind: 'hls' as const, url: source };
  }

  const mp4Url = resolveLessonPlaybackUrl(source) || source;
  if (/^[a-f0-9-]{36}$/i.test(mp4Url)) {
    return { kind: 'empty' as const, url: '' };
  }

  return { kind: 'mp4' as const, url: mp4Url };
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
