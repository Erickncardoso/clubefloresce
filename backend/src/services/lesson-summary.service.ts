import { CourseRepository } from "../repositories/course.repository";
import { parseCloudinaryVideoUrl } from "../utils/cloudinary-transcription";
import {
  fetchBunnyVideoDescription,
  formatBunnyDescriptionForLesson,
  isBunnyTranscriptionVideoUrl,
} from "../utils/media/bunny-transcription";
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

function supportsAutoTranscription(videoUrl?: string | null): boolean {
  if (!videoUrl) return false;
  return Boolean(parseCloudinaryVideoUrl(videoUrl) || isBunnyTranscriptionVideoUrl(videoUrl));
}

export function shouldScheduleLessonTranscriptionSync(videoUrl?: string | null): boolean {
  return supportsAutoTranscription(videoUrl);
}

export class LessonSummaryService {
  private async buildSummaryContent(
    lesson: { title: string; duration?: string | null },
    transcription: unknown[],
    transcriptText: string,
  ): Promise<string> {
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
            "Responda em português do Brasil, em texto limpo e elegante — SEM markdown (sem #, ##, -, * ou listas com hífen).",
            "Estrutura: primeira linha com o título da aula em uma frase clara; parágrafo introdutório; linha 'Objetivos de aprendizagem' seguida de itens numerados (1. 2. 3.); parágrafo final com aplicação prática.",
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

    return content;
  }

  async tryApplyBunnyDescriptionIfEmpty(lessonId: string): Promise<boolean> {
    const lesson = await courseRepository.findLessonById(lessonId);
    if (!lesson) return false;
    if (String(lesson.content || "").trim()) return false;
    if (!isBunnyTranscriptionVideoUrl(lesson.videoUrl)) return false;

    const description = await fetchBunnyVideoDescription(lesson.videoUrl);
    if (!description) return false;

    const content = formatBunnyDescriptionForLesson(lesson.title, description);
    if (!content) return false;

    await courseRepository.updateLesson(lessonId, { content });
    console.log(`[Summary] Descrição automática do vídeo salva como resumo da aula ${lessonId}`);
    return true;
  }

  async autoGenerateSummaryIfEmpty(lessonId: string): Promise<boolean> {
    const lesson = await courseRepository.findLessonById(lessonId);
    if (!lesson) return false;
    if (String(lesson.content || "").trim()) return false;
    if (!supportsAutoTranscription(lesson.videoUrl)) return false;

    if (isBunnyTranscriptionVideoUrl(lesson.videoUrl)) {
      const applied = await this.tryApplyBunnyDescriptionIfEmpty(lessonId);
      if (applied) return true;
    }

    if (!openai.isEnabled()) {
      console.warn(`[Summary] OPENAI_API_KEY ausente — resumo automático ignorado para aula ${lessonId}`);
      return false;
    }

    const transcription = Array.isArray(lesson.transcription) ? lesson.transcription : [];
    const transcriptText = flattenTranscription(transcription);
    if (!transcriptText) return false;

    try {
      const content = await this.buildSummaryContent(lesson, transcription, transcriptText);
      await courseRepository.updateLesson(lessonId, { content });
      console.log(`[Summary] Resumo automático salvo para aula ${lessonId}`);
      return true;
    } catch (error: any) {
      console.warn(
        `[Summary] Falha ao gerar resumo automático da aula ${lessonId}:`,
        error?.message || error,
      );
      return false;
    }
  }

  async generateSummary(lessonId: string): Promise<{
    content: string;
    transcriptionStatus: "ready" | "pending" | "unavailable";
    transcriptionLines: number;
  }> {
    const lesson = await courseRepository.findLessonById(lessonId);
    if (!lesson) {
      throw new Error("Aula não encontrada.");
    }

    if (!supportsAutoTranscription(lesson.videoUrl)) {
      throw new Error(
        "A transcrição automática só funciona para vídeos enviados pelo upload da plataforma. Para links externos, escreva o resumo manualmente.",
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
          "A transcrição ainda está sendo gerada. Vídeos longos podem levar alguns minutos após o upload — aguarde e tente novamente.",
        );
      }
      throw new Error(
        "Não foi possível obter a transcrição deste vídeo. Verifique se o upload foi concluído e tente sincronizar de novo.",
      );
    }

    const content = await this.buildSummaryContent(lesson, transcription, transcriptText);

    return {
      content,
      transcriptionStatus: sync.status,
      transcriptionLines: transcription.length,
    };
  }
}

export const lessonSummaryService = new LessonSummaryService();
