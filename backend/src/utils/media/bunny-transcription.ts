import {
  formatTranscriptionTime,
  type TranscriptionLine,
} from "../cloudinary-transcription";
import {
  buildBunnyStreamCaptionUrl,
  getBunnyStreamApiKey,
  getBunnyStreamCdnHostname,
  getBunnyStreamLibraryId,
  isBunnyStreamConfigured,
  isBunnyStreamUrl,
  parseBunnyStreamVideoId,
} from "./bunny-config";

type BunnyCaptionModel = {
  srclang?: string | null;
  label?: string | null;
};

type BunnyVideoModel = {
  guid?: string;
  status?: number;
  encodeProgress?: number;
  description?: string | null;
  captions?: BunnyCaptionModel[] | null;
};

const BUNNY_VIDEO_FINISHED_STATUS = 4;

const PT_LANG_CANDIDATES = ["pt-br", "pt", "por", "portuguese", "pt_br"];
const FALLBACK_LANG_CANDIDATES = ["en", "en-us", "english"];

function getPreferredTranscriptionLang(): string {
  return String(process.env.BUNNY_TRANSCRIPTION_LANG || "pt").trim().toLowerCase();
}

function normalizeLang(value?: string | null): string {
  return String(value || "").trim().toLowerCase();
}

export function pickBunnyCaptionLanguage(
  captions: BunnyCaptionModel[] | null | undefined,
  preferredLang = getPreferredTranscriptionLang(),
): string | null {
  const available = (captions || [])
    .map((caption) => normalizeLang(caption.srclang))
    .filter(Boolean);

  if (!available.length) return null;

  const preferred = normalizeLang(preferredLang);
  const exact = available.find((lang) => lang === preferred);
  if (exact) return exact;

  const preferredPrefix = available.find((lang) => lang.startsWith(preferred));
  if (preferredPrefix) return preferredPrefix;

  for (const candidate of PT_LANG_CANDIDATES) {
    const match = available.find((lang) => lang === candidate || lang.startsWith("pt"));
    if (match) return match;
  }

  for (const candidate of FALLBACK_LANG_CANDIDATES) {
    const match = available.find((lang) => lang === candidate || lang.startsWith("en"));
    if (match) return match;
  }

  return available[0] || null;
}

function getCaptionLanguageCandidates(preferredLang = getPreferredTranscriptionLang()): string[] {
  const preferred = normalizeLang(preferredLang);
  return Array.from(new Set([
    preferred,
    ...PT_LANG_CANDIDATES,
    ...FALLBACK_LANG_CANDIDATES,
  ]));
}

function parseVttTimestamp(value: string): number {
  const normalized = String(value || "").trim().replace(",", ".");
  const parts = normalized.split(":");

  if (parts.length === 3) {
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const seconds = Number(parts[2]);
    return (hours * 3600) + (minutes * 60) + seconds;
  }

  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    return (minutes * 60) + seconds;
  }

  return Number(normalized) || 0;
}

export function parseVttToTranscriptionLines(vtt: string): TranscriptionLine[] {
  const normalized = String(vtt || "").replace(/\r/g, "").trim();
  if (!normalized) return [];

  const blocks = normalized.split(/\n{2,}/);
  const lines: TranscriptionLine[] = [];

  for (const block of blocks) {
    const rows = block.split("\n").map((row) => row.trim()).filter(Boolean);
    const timeRowIndex = rows.findIndex((row) => /-->/i.test(row));
    if (timeRowIndex === -1) continue;

    const [startRaw] = rows[timeRowIndex].split("-->").map((part) => part.trim());
    const seconds = parseVttTimestamp(startRaw);
    const text = rows
      .slice(timeRowIndex + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .trim();

    if (!text) continue;

    lines.push({
      time: formatTranscriptionTime(seconds),
      text: `${text} `,
      seconds,
    });
  }

  return lines;
}

async function fetchBunnyVideoModel(videoId: string): Promise<BunnyVideoModel | null> {
  if (!isBunnyStreamConfigured()) return null;

  const libraryId = getBunnyStreamLibraryId();
  const apiKey = getBunnyStreamApiKey();

  try {
    const response = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
      { headers: { AccessKey: apiKey } },
    );

    if (!response.ok) return null;
    return await response.json() as BunnyVideoModel;
  } catch {
    return null;
  }
}

async function fetchFirstAvailableCaptionUrl(videoId: string, languages: string[]): Promise<string | null> {
  for (const language of languages) {
    const url = buildBunnyStreamCaptionUrl(videoId, language);
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return url;
    } catch {
      /* tenta próximo idioma */
    }
  }
  return null;
}

export function isBunnyVideoReadyForCaptions(video: BunnyVideoModel | null | undefined): boolean {
  if (!video) return false;
  if (video.status === undefined || video.status === null) return true;
  return video.status >= BUNNY_VIDEO_FINISHED_STATUS;
}

export function isBunnyTranscriptionVideoUrl(videoUrl: string): boolean {
  return isBunnyStreamUrl(videoUrl) || Boolean(parseBunnyStreamVideoId(videoUrl));
}

export async function getBunnyVideoDetails(videoId: string): Promise<BunnyVideoModel | null> {
  return fetchBunnyVideoModel(videoId);
}

export async function fetchBunnyVideoDescription(videoUrl: string): Promise<string | null> {
  const videoId = parseBunnyStreamVideoId(videoUrl);
  if (!videoId) return null;

  const video = await fetchBunnyVideoModel(videoId);
  const description = String(video?.description || "").trim();
  return description || null;
}

export function formatBunnyDescriptionForLesson(
  lessonTitle: string,
  description: string,
): string {
  const body = String(description || "").trim();
  if (!body) return "";

  const title = String(lessonTitle || "").trim();
  const normalizedBody = body.replace(/\s+/g, " ").trim();
  const alreadyHasTitle = title
    && new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(normalizedBody.slice(0, 160));

  if (alreadyHasTitle || !title) return body;
  return `Resumo da aula: ${title}\n\n${body}`;
}

export async function fetchBunnyCaptionUrl(
  videoUrl: string,
  preferredLang = getPreferredTranscriptionLang(),
): Promise<string | null> {
  const videoId = parseBunnyStreamVideoId(videoUrl);
  if (!videoId) return null;

  const video = await fetchBunnyVideoModel(videoId);
  if (!isBunnyVideoReadyForCaptions(video)) return null;

  const selectedLang = pickBunnyCaptionLanguage(video?.captions, preferredLang);

  if (selectedLang) {
    const url = buildBunnyStreamCaptionUrl(videoId, selectedLang);
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return url;
    } catch {
      /* fallback abaixo */
    }
  }

  return fetchFirstAvailableCaptionUrl(videoId, getCaptionLanguageCandidates(preferredLang));
}

export async function fetchBunnyTranscription(
  videoUrl: string,
  preferredLang = getPreferredTranscriptionLang(),
): Promise<TranscriptionLine[] | null> {
  const videoId = parseBunnyStreamVideoId(videoUrl);
  if (!videoId) return null;

  const video = await fetchBunnyVideoModel(videoId);
  if (!isBunnyVideoReadyForCaptions(video)) return null;

  const captionUrl = await fetchBunnyCaptionUrl(videoUrl, preferredLang);
  if (!captionUrl) return null;

  try {
    const response = await fetch(captionUrl, { method: "GET" });
    if (!response.ok) return null;

    const vtt = await response.text();
    const lines = parseVttToTranscriptionLines(vtt);
    return lines.length ? lines : null;
  } catch {
    return null;
  }
}

export function getBunnyCaptionUrlFromVideoUrl(
  videoUrl: string,
  preferredLang = getPreferredTranscriptionLang(),
): string {
  const videoId = parseBunnyStreamVideoId(videoUrl);
  if (!videoId) return "";

  try {
    const host = new URL(videoUrl).host || getBunnyStreamCdnHostname();
    const lang = normalizeLang(preferredLang) || "pt";
    return `https://${host}/${videoId}/captions/${lang}.vtt`;
  } catch {
    return buildBunnyStreamCaptionUrl(videoId, preferredLang);
  }
}
