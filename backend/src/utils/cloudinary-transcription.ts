const CLOUDINARY_HOST = "res.cloudinary.com";

export type CloudinaryVideoRef = {
  cloudName: string;
  publicId: string;
  version?: number;
};

export type TranscriptionLine = {
  time: string;
  text: string;
  seconds: number;
};

type TranscriptSegment = {
  transcript?: string;
  words?: Array<{ word?: string; start_time?: number; end_time?: number }>;
};

export function parseCloudinaryVideoUrl(videoUrl: string): CloudinaryVideoRef | null {
  if (!videoUrl || !videoUrl.includes(CLOUDINARY_HOST)) return null;

  try {
    const url = new URL(videoUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const uploadIdx = parts.indexOf("upload");
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
      if (segment.includes(",") || /^[a-z]{1,3}_[\w.-]+$/i.test(segment)) {
        cursor += 1;
        continue;
      }
      break;
    }

    const publicIdWithExt = parts.slice(cursor).join("/");
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
    if (!cloudName || !publicId) return null;

    return { cloudName, publicId, version };
  } catch {
    return null;
  }
}

export function buildCloudinaryRawUrl(
  ref: CloudinaryVideoRef,
  suffix: string,
): string {
  const versionSegment = ref.version ? `v${ref.version}/` : "";
  return `https://${CLOUDINARY_HOST}/${ref.cloudName}/raw/upload/${versionSegment}${ref.publicId}${suffix}`;
}

export function getCaptionCandidateUrls(videoUrl: string, lang = "pt-BR"): string[] {
  const ref = parseCloudinaryVideoUrl(videoUrl);
  if (!ref) return [];

  const suffixes = lang
    ? [`.${lang}.vtt`, ".vtt", `.${lang}.srt`, ".srt"]
    : [".vtt", ".srt"];

  return suffixes.map((suffix) => buildCloudinaryRawUrl(ref, suffix));
}

export function getTranscriptCandidateUrls(videoUrl: string, lang = "pt-BR"): string[] {
  const ref = parseCloudinaryVideoUrl(videoUrl);
  if (!ref) return [];

  const suffixes = lang
    ? [`.${lang}.transcript`, ".transcript"]
    : [".transcript"];

  return suffixes.map((suffix) => buildCloudinaryRawUrl(ref, suffix));
}

export function formatTranscriptionTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTranscriptionWord(word: string): string {
  const text = word.trim();
  if (!text) return "";
  return /[,.!?;:]$/.test(text) ? `${text} ` : `${text} `;
}

export function parseCloudinaryTranscriptPayload(
  payload: unknown,
): TranscriptionLine[] {
  const segments: TranscriptSegment[] = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? [payload as TranscriptSegment]
      : [];

  const words: TranscriptionLine[] = [];

  for (const segment of segments) {
    if (segment.words?.length) {
      for (const word of segment.words) {
        const text = formatTranscriptionWord(String(word.word || ""));
        if (!text) continue;
        const seconds = Number(word.start_time ?? 0);
        words.push({
          time: formatTranscriptionTime(seconds),
          text,
          seconds,
        });
      }
      continue;
    }

    const text = String(segment.transcript || "").trim();
    if (!text) continue;
    const seconds = Number(segment.words?.[0]?.start_time ?? 0);
    words.push({
      time: formatTranscriptionTime(seconds),
      text: `${text} `,
      seconds,
    });
  }

  return words;
}

async function fetchFirstAvailable(urls: string[]): Promise<Response | null> {
  for (const url of urls) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) return response;
    } catch {
      /* tenta próxima URL */
    }
  }
  return null;
}

export async function fetchCloudinaryCaptionUrl(
  videoUrl: string,
  lang = "pt-BR",
): Promise<string | null> {
  const candidates = getCaptionCandidateUrls(videoUrl, lang);
  for (const url of candidates) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return url;
    } catch {
      /* tenta próxima URL */
    }
  }
  return null;
}

export async function fetchCloudinaryTranscription(
  videoUrl: string,
  lang = "pt-BR",
): Promise<TranscriptionLine[] | null> {
  const response = await fetchFirstAvailable(getTranscriptCandidateUrls(videoUrl, lang));
  if (!response) return null;

  const payload = await response.json().catch(() => null);
  const lines = parseCloudinaryTranscriptPayload(payload);
  return lines.length ? lines : null;
}

export function getTranscriptionRawConvert(lang = "pt-BR"): string {
  return `google_speech:${lang}:vtt`;
}
