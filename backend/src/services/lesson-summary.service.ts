import { CourseRepository } from "../repositories/course.repository";
import { parseCloudinaryVideoUrl } from "../utils/cloudinary-transcription";
import { OpenAIClient } from "./bella/openai.client";
import { lessonTranscriptionService } from "./lesson-transcription.service";
import { readEnv } from "../utils/env";

const courseRepository = new CourseRepository();
const openai = new OpenAIClient();

type TranscriptionLine = { time?: string; text?: string; seconds?: number };

function flattenTranscription(lines: unknown): string {
  if (!Array.isArray(lines) || !lines.length) return "";
  return lines
    .map((line) => {
      const item = line as TranscriptionLine;
      return String(item.text || "").trim();
    })
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export class LessonSummaryService {
  async generateSummary(lessonId: string): Promise<{
    content: string;
    transcriptionStatus: "ready" | "pending" | "unavailable";
    transcriptionLines: number;
  }> {
    const lesson = await courseRepository.findLessonById(lessonId);
    if (!lesson) {
      throw new Error("Aula não encontrada.");
    }

    if (!lesson.videoUrl || !parseCloudinaryVideoUrl(lesson.videoUrl)) {
      throw new Error(
        "A transcrição automática só funciona para vídeos enviados pelo upload (Cloudinary). Para links externos, escreva o resumo manualmente.",
      );
    }

    if (!openai.isEnabled()) {
      throw new Error("Geração com IA indisponível. Configure OPENAI_API_KEY no servidor.");
    }

    const sync = await lessonTranscriptionService.syncLessonTranscription(lessonId);
    const transcription = sync.transcription?.length
      ? sync.transcription
      : Array.isArray(lesson.transcription)
        ? lesson.transcription
        : [];

    const transcriptText = flattenTranscription(transcription);

    if (!transcriptText) {
      if (sync.status === "pending") {
        throw new Error(
          "A transcrição ainda está sendo processada pelo Cloudinary. Aguarde alguns minutos após o upload e tente novamente.",
        );
      }
      throw new Error(
        "Não foi possível obter a transcrição deste vídeo. Verifique se o recurso de legendas está ativo no Cloudinary.",
      );
    }

    const model = readEnv("OPENAI_MODEL") || "gpt-4o-mini";
    const completion = await openai.complete({
      model,
      temperature: 0.45,
      maxTokens: 1400,
      messages: [
        {
          role: "system",
          content: [
            "Você é uma nutricionista educadora escrevendo o resumo de uma aula para alunas.",
            "Responda em português do Brasil, em markdown leve (parágrafos, listas com hífen).",
            "Inclua: breve introdução do tema, 3 a 6 objetivos de aprendizagem em lista, e um parágrafo final com aplicação prática.",
            "Seja clara, acolhedora e objetiva. Não invente informações que não estejam na transcrição.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Título da aula: ${lesson.title}`,
            lesson.duration ? `Duração: ${lesson.duration}` : "",
            "",
            "Transcrição do vídeo:",
            transcriptText.slice(0, 120_000),
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const content = completion.content?.trim();
    if (!content) {
      throw new Error("A IA não retornou um resumo. Tente novamente em instantes.");
    }

    return {
      content,
      transcriptionStatus: sync.status,
      transcriptionLines: transcription.length,
    };
  }
}

export const lessonSummaryService = new LessonSummaryService();
