import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import ffmpegPath from "ffmpeg-static";

const MB = 1024 * 1024;
const DEFAULT_TARGET_MAX_MB = Number(process.env.VIDEO_TARGET_MAX_SIZE_MB || 95);
export const VIDEO_TARGET_MAX_BYTES = DEFAULT_TARGET_MAX_MB * MB;

export type VideoCompressResult = {
  outputPath: string;
  originalBytes: number;
  compressedBytes: number;
  wasCompressed: boolean;
};

function resolveFfmpegBinary(): string | null {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  if (ffmpegPath && fs.existsSync(ffmpegPath)) return ffmpegPath;
  return null;
}

function resolveFfprobeBinary(): string | null {
  const fromEnv = process.env.FFPROBE_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  try {
    const ffprobeStatic = require("ffprobe-static") as { path?: string };
    const bundled = ffprobeStatic?.path;
    if (bundled && fs.existsSync(bundled)) return bundled;
  } catch {
    // ffprobe-static indisponível
  }
  return null;
}

export function isVideoCompressionAvailable(): boolean {
  return Boolean(resolveFfmpegBinary() && resolveFfprobeBinary());
}

function runCommand(
  binary: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(stderr.trim() || stdout.trim() || `Comando falhou (${binary})`));
    });
  });
}

async function getVideoDurationSeconds(filePath: string): Promise<number> {
  const ffprobe = resolveFfprobeBinary();
  if (!ffprobe) throw new Error("ffprobe não encontrado para analisar o vídeo.");

  const { stdout } = await runCommand(ffprobe, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);

  const duration = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Não foi possível detectar a duração do vídeo.");
  }
  return duration;
}

function buildOutputPath(inputPath: string): string {
  const base = path.basename(inputPath, path.extname(inputPath));
  return path.join(os.tmpdir(), `${base}-compressed-${Date.now()}.mp4`);
}

async function encodeWithBitrate(
  ffmpeg: string,
  inputPath: string,
  outputPath: string,
  videoKbps: number,
  maxWidth: number,
): Promise<void> {
  const videoBitrate = `${Math.round(videoKbps)}k`;
  const bufsize = `${Math.round(videoKbps * 2)}k`;
  const scaleFilter = `scale='min(${maxWidth},iw)':-2`;

  await runCommand(ffmpeg, [
    "-y",
    "-i",
    inputPath,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-b:v",
    videoBitrate,
    "-maxrate",
    videoBitrate,
    "-bufsize",
    bufsize,
    "-vf",
    scaleFilter,
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ac",
    "2",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

/**
 * Comprime vídeos acima do limite para MP4 H.264 (~100 MB por padrão).
 * Se já estiver abaixo do limite, retorna o arquivo original.
 */
export async function compressVideoToMaxSize(
  inputPath: string,
  targetMaxBytes: number = VIDEO_TARGET_MAX_BYTES,
): Promise<VideoCompressResult> {
  const stats = await fs.promises.stat(inputPath);
  const originalBytes = stats.size;

  if (originalBytes <= targetMaxBytes) {
    return {
      outputPath: inputPath,
      originalBytes,
      compressedBytes: originalBytes,
      wasCompressed: false,
    };
  }

  const ffmpeg = resolveFfmpegBinary();
  if (!ffmpeg) {
    throw new Error(
      "Compressor de vídeo indisponível (FFmpeg não encontrado no servidor).",
    );
  }

  const durationSec = await getVideoDurationSeconds(inputPath);
  const audioKbps = 128;
  const safetyMargin = 0.9;
  const totalKbpsBudget = ((targetMaxBytes * 8 * safetyMargin) / durationSec) / 1000;
  let videoKbps = Math.max(350, totalKbpsBudget - audioKbps);
  let maxWidth = 1280;

  const outputPath = buildOutputPath(inputPath);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await encodeWithBitrate(ffmpeg, inputPath, outputPath, videoKbps, maxWidth);
      const compressedStats = await fs.promises.stat(outputPath);

      if (compressedStats.size <= targetMaxBytes) {
        return {
          outputPath,
          originalBytes,
          compressedBytes: compressedStats.size,
          wasCompressed: true,
        };
      }

      if (attempt === 3) {
        return {
          outputPath,
          originalBytes,
          compressedBytes: compressedStats.size,
          wasCompressed: true,
        };
      }

      videoKbps = Math.max(250, videoKbps * 0.82);
      if (attempt >= 1) maxWidth = 960;
      if (attempt >= 2) maxWidth = 720;
      await fs.promises.unlink(outputPath).catch(() => undefined);
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await fs.promises.unlink(outputPath).catch(() => undefined);
      videoKbps = Math.max(250, videoKbps * 0.82);
    }
  }

  throw lastError || new Error("Falha ao comprimir o vídeo.");
}
