const CLOUDINARY_HOST = 'res.cloudinary.com';

export type VideoQualityPreset = 'auto' | '480p' | '720p' | '1080p';

const QUALITY_TRANSFORMS: Record<Exclude<VideoQualityPreset, 'auto'>, string> = {
  '480p': 'h_480,c_limit,q_auto:eco',
  '720p': 'h_720,c_limit,q_auto:good',
  '1080p': 'h_1080,c_limit,q_auto:best',
};

type CloudinaryVideoRef = {
  cloudName: string;
  publicId: string;
  version?: number;
  extension: string;
};

function isLikelyTransformSegment(segment: string): boolean {
  if (!segment || segment.includes('.')) return false;
  if (/^v\d+$/.test(segment)) return false;
  if (segment.includes(',')) return true;
  return /^[a-z]{1,3}_[\w.-]+$/i.test(segment);
}

function parseCloudinaryVideoUrl(videoUrl: string): CloudinaryVideoRef | null {
  if (!videoUrl || !videoUrl.includes(CLOUDINARY_HOST)) return null;

  try {
    const url = new URL(videoUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx < 2) return null;

    const cloudName = parts[uploadIdx - 2];
    let cursor = uploadIdx + 1;
    let version: number | undefined;

    while (cursor < parts.length) {
      const segment = parts[cursor];
      if (/^v\d+$/.test(segment)) {
        version = Number(segment.slice(1));
        cursor += 1;
        break;
      }
      if (isLikelyTransformSegment(segment)) {
        cursor += 1;
        continue;
      }
      break;
    }

    const publicIdWithExt = parts.slice(cursor).join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
    const extension = publicIdWithExt.match(/\.([a-z0-9]+)$/i)?.[1] || 'mp4';
    if (!cloudName || !publicId) return null;

    return { cloudName, publicId, version, extension };
  } catch {
    return null;
  }
}

function buildCloudinaryVideoUrl(ref: CloudinaryVideoRef, transform?: string): string {
  const versionSegment = ref.version ? `v${ref.version}/` : '';
  const transformSegment = transform ? `${transform}/` : '';
  return `https://${CLOUDINARY_HOST}/${ref.cloudName}/video/upload/${transformSegment}${versionSegment}${ref.publicId}.${ref.extension}`;
}

export function isCloudinaryVideoUrl(videoUrl?: string | null): boolean {
  return Boolean(videoUrl && parseCloudinaryVideoUrl(videoUrl));
}

export function applyCloudinaryVideoQuality(
  videoUrl: string,
  quality: VideoQualityPreset = '720p',
): string {
  if (!isCloudinaryVideoUrl(videoUrl)) return videoUrl;

  const ref = parseCloudinaryVideoUrl(videoUrl);
  if (!ref) return videoUrl;

  if (quality === 'auto') return buildCloudinaryVideoUrl(ref);
  return buildCloudinaryVideoUrl(ref, QUALITY_TRANSFORMS[quality]);
}
