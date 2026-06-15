const STORAGE_HOST_BY_REGION: Record<string, string> = {
  de: "storage.bunnycdn.com",
  falkenstein: "storage.bunnycdn.com",
  ny: "ny.storage.bunnycdn.com",
  la: "la.storage.bunnycdn.com",
  sg: "sg.storage.bunnycdn.com",
  syd: "syd.storage.bunnycdn.com",
  uk: "uk.storage.bunnycdn.com",
  se: "se.storage.bunnycdn.com",
  br: "br.storage.bunnycdn.com",
  jh: "jh.storage.bunnycdn.com",
};

export function isBunnyStreamConfigured(): boolean {
  return Boolean(
    process.env.BUNNY_STREAM_LIBRARY_ID
    && process.env.BUNNY_STREAM_API_KEY
    && process.env.BUNNY_STREAM_CDN_HOSTNAME,
  );
}

export function isBunnyStorageConfigured(): boolean {
  return Boolean(
    process.env.BUNNY_STORAGE_ZONE_NAME
    && process.env.BUNNY_STORAGE_API_KEY
    && process.env.BUNNY_STORAGE_CDN_HOSTNAME,
  );
}

export function getBunnyStreamLibraryId(): string {
  const value = String(process.env.BUNNY_STREAM_LIBRARY_ID || "").trim();
  if (!value) throw new Error("BUNNY_STREAM_LIBRARY_ID não configurado.");
  return value;
}

export function getBunnyStreamApiKey(): string {
  const value = String(process.env.BUNNY_STREAM_API_KEY || "").trim();
  if (!value) throw new Error("BUNNY_STREAM_API_KEY não configurado.");
  return value;
}

export function getBunnyStreamCdnHostname(): string {
  return String(process.env.BUNNY_STREAM_CDN_HOSTNAME || "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function getBunnyStreamCollectionId(): string | null {
  const value = String(process.env.BUNNY_STREAM_COLLECTION_ID || "").trim();
  return value || null;
}

export function getBunnyStorageZoneName(): string {
  const value = String(process.env.BUNNY_STORAGE_ZONE_NAME || "").trim();
  if (!value) throw new Error("BUNNY_STORAGE_ZONE_NAME não configurado.");
  return value;
}

export function getBunnyStorageApiKey(): string {
  const value = String(process.env.BUNNY_STORAGE_API_KEY || "").trim();
  if (!value) throw new Error("BUNNY_STORAGE_API_KEY não configurado.");
  return value;
}

export function getBunnyStorageCdnHostname(): string {
  return String(process.env.BUNNY_STORAGE_CDN_HOSTNAME || "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function getBunnyStorageApiHost(): string {
  const region = String(process.env.BUNNY_STORAGE_REGION || "de").trim().toLowerCase();
  return STORAGE_HOST_BY_REGION[region] || STORAGE_HOST_BY_REGION.de;
}

export function buildBunnyStreamHlsUrl(videoGuid: string): string {
  const host = getBunnyStreamCdnHostname();
  return `https://${host}/${videoGuid}/playlist.m3u8`;
}

export function buildBunnyStreamMp4Url(videoGuid: string, height = 720): string {
  const host = getBunnyStreamCdnHostname();
  return `https://${host}/${videoGuid}/play_${height}p.mp4`;
}

export function buildBunnyStoragePublicUrl(storagePath: string): string {
  const host = getBunnyStorageCdnHostname();
  const normalized = storagePath.replace(/^\/+/, "");
  return `https://${host}/${normalized}`;
}

export function isBunnyStreamUrl(url: string): boolean {
  if (!url) return false;
  const cdnHost = String(process.env.BUNNY_STREAM_CDN_HOSTNAME || "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (cdnHost && url.includes(cdnHost)) return true;
  return /\/playlist\.m3u8(?:\?|$)/i.test(url) && /\.b-cdn\.net\//i.test(url);
}

export function parseBunnyStreamVideoId(videoUrl: string): string | null {
  if (!videoUrl) return null;

  try {
    const pathname = new URL(videoUrl).pathname;
    const parts = pathname.split("/").filter(Boolean);
    if (!parts.length) return null;

    const last = parts[parts.length - 1];
    if (last === "playlist.m3u8") return parts[parts.length - 2] || null;
    if (/^[a-f0-9-]{36}$/i.test(last)) return last;
    return parts[0] || null;
  } catch {
    return null;
  }
}

export function buildBunnyStreamCaptionUrl(videoId: string, languageCode: string): string {
  const host = getBunnyStreamCdnHostname();
  const lang = String(languageCode || "pt").trim().toLowerCase();
  return `https://${host}/${videoId}/captions/${lang}.vtt`;
}

export function isBunnyStorageUrl(url: string): boolean {
  if (!url) return false;
  const cdnHost = getBunnyStorageCdnHostname();
  return Boolean(cdnHost && url.includes(cdnHost));
}
