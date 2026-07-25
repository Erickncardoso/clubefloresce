import { randomUUID } from "crypto";
import { anamneseTranscriptionService } from "./anamnese-transcription.service";
import { notifyAnamneseTranscriptionJob } from "./anamnese-transcription-pusher.service";

export type AnamneseTranscriptionJobStatus = "queued" | "processing" | "completed" | "error";

export type AnamneseTranscriptionJob = {
  id: string;
  nutriId: string;
  patientId: string;
  patientName: string;
  anamneseTitle: string;
  fileName: string;
  status: AnamneseTranscriptionJobStatus;
  text: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

type AudioPayload = {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
};

const jobs = new Map<string, AnamneseTranscriptionJob>();
const audioByJob = new Map<string, AudioPayload>();
const processing = new Set<string>();

const JOB_TTL_MS = 24 * 60 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function pruneOldJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs.entries()) {
    const ts = Date.parse(job.completedAt || job.updatedAt || job.createdAt);
    if (!Number.isNaN(ts) && ts < cutoff) {
      jobs.delete(id);
      audioByJob.delete(id);
      processing.delete(id);
    }
  }
}

export function createAnamneseTranscriptionJob(input: {
  nutriId: string;
  patientId: string;
  patientName?: string;
  anamneseTitle?: string;
  file: AudioPayload;
}): AnamneseTranscriptionJob {
  pruneOldJobs();

  const id = randomUUID();
  const createdAt = nowIso();
  const job: AnamneseTranscriptionJob = {
    id,
    nutriId: String(input.nutriId),
    patientId: String(input.patientId),
    patientName: String(input.patientName || "").trim(),
    anamneseTitle: String(input.anamneseTitle || "").trim(),
    fileName: String(input.file.originalname || "anamnese.webm").replace(/[^\w.\-]+/g, "_"),
    status: "queued",
    text: null,
    error: null,
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
  };

  jobs.set(id, job);
  audioByJob.set(id, input.file);
  void processAnamneseTranscriptionJob(id);
  return job;
}

export function getAnamneseTranscriptionJob(jobId: string, nutriId: string): AnamneseTranscriptionJob | null {
  const job = jobs.get(String(jobId || ""));
  if (!job || job.nutriId !== String(nutriId)) return null;
  return job;
}

export function getAnamneseTranscriptionJobAudio(jobId: string, nutriId: string): AudioPayload | null {
  const job = getAnamneseTranscriptionJob(jobId, nutriId);
  if (!job) return null;
  return audioByJob.get(job.id) || null;
}

async function processAnamneseTranscriptionJob(jobId: string) {
  const id = String(jobId || "");
  if (!id || processing.has(id)) return;
  processing.add(id);

  const job = jobs.get(id);
  const file = audioByJob.get(id);
  if (!job || !file?.buffer?.length) {
    processing.delete(id);
    return;
  }

  job.status = "processing";
  job.updatedAt = nowIso();
  jobs.set(id, job);

  try {
    const result = await anamneseTranscriptionService.transcribeAudio(file);
    const text = String(result.text || "").trim();
    if (!text) throw new Error("Transcrição vazia.");

    job.status = "completed";
    job.text = text;
    job.error = null;
    job.completedAt = nowIso();
    job.updatedAt = job.completedAt;
    jobs.set(id, job);
    audioByJob.delete(id);

    void notifyAnamneseTranscriptionJob(job.nutriId, {
      jobId: job.id,
      patientId: job.patientId,
      patientName: job.patientName,
      anamneseTitle: job.anamneseTitle,
      status: "completed",
      text,
    });
  } catch (error: any) {
    const message = String(error?.message || "Falha ao transcrever o áudio.");
    job.status = "error";
    job.error = message;
    job.updatedAt = nowIso();
    jobs.set(id, job);
    /* Mantém áudio em memória para retry/download via cliente local */

    void notifyAnamneseTranscriptionJob(job.nutriId, {
      jobId: job.id,
      patientId: job.patientId,
      patientName: job.patientName,
      anamneseTitle: job.anamneseTitle,
      status: "error",
      error: message,
    });
  } finally {
    processing.delete(id);
  }
}
