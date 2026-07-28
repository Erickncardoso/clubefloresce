export type TranscriptionChunk = {
  time: string;
  text: string;
  seconds: number;
};

export function parseTranscriptionTimeToSeconds(time: string): number {
  const parts = String(time || '').split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function formatTranscriptionDisplayTime(time: string, seconds?: number): string {
  const total = Number.isFinite(seconds)
    ? Number(seconds)
    : parseTranscriptionTimeToSeconds(time);
  if (!Number.isFinite(total) || total < 0) return time || '0:00';

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = Math.floor(total % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function getTranscriptionDisplayLines(transcription: unknown): TranscriptionChunk[] {
  if (!Array.isArray(transcription) || !transcription.length) return [];

  return transcription
    .map((line) => {
      if (!line || typeof line !== 'object') return null;
      const item = line as Record<string, unknown>;
      const text = String(item.text || '').trim();
      if (!text) return null;
      const seconds = Number(
        item.seconds ?? parseTranscriptionTimeToSeconds(String(item.time || '')),
      );
      return {
        time: formatTranscriptionDisplayTime(String(item.time || ''), seconds),
        text,
        seconds,
      };
    })
    .filter((line): line is TranscriptionChunk => Boolean(line));
}
