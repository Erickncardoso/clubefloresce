import { v2 as cloudinary } from "cloudinary";
import { CourseRepository } from "../repositories/course.repository";
import {
  fetchCloudinaryCaptionUrl,
  fetchCloudinaryTranscription,
  getTranscriptionRawConvert,
  parseCloudinaryVideoUrl,
} from "../utils/cloudinary-transcription";
import { isBunnyStreamUrl, parseBunnyStreamVideoId } from "../utils/media/bunny-config";
import {
  fetchBunnyCaptionUrl,
  fetchBunnyTranscription,
  getBunnyVideoDetails,
  isBunnyTranscriptionVideoUrl,
  isBunnyVideoReadyForCaptions,
} from "../utils/media/bunny-transcription";

const courseRepository = new CourseRepository();
const CLOUDINARY_TRANSCRIPTION_LANG = process.env.CLOUDINARY_TRANSCRIPTION_LANG || "pt-BR";
const BUNNY_TRANSCRIPTION_LANG = process.env.BUNNY_TRANSCRIPTION_LANG || "pt";

type TranscriptionProvider = "cloudinary" | "bunny";

function resolveTranscriptionProvider(videoUrl: string): TranscriptionProvider | null {
  if (parseCloudinaryVideoUrl(videoUrl)) return "cloudinary";
  if (isBunnyTranscriptionVideoUrl(videoUrl) || isBunnyStreamUrl(videoUrl) || parseBunnyStreamVideoId(videoUrl)) {
    return "bunny";
  }
  return null;
}

export class LessonTranscriptionService {
  async syncLessonTranscription(lessonId: string): Promise<{
    status: "pending" | "ready" | "unavailable";
    transcription?: unknown[];
    captionUrl?: string | null;
  }> {
    const lesson = await courseRepository.findLessonById(lessonId);
    if (!lesson?.videoUrl) {
      return { status: "unavailable" };
    }

    const provider = resolveTranscriptionProvider(lesson.videoUrl);
    if (!provider) {
      return { status: "unavailable" };
    }

    let captionUrl: string | null = null;
    let transcription = null as Awaited<ReturnType<typeof fetchCloudinaryTranscription>>;

    if (provider === "cloudinary") {
      captionUrl = await fetchCloudinaryCaptionUrl(lesson.videoUrl, CLOUDINARY_TRANSCRIPTION_LANG);
      transcription = await fetchCloudinaryTranscription(lesson.videoUrl, CLOUDINARY_TRANSCRIPTION_LANG);

      if (!transcription?.length) {
        await this.requestCloudinaryTranscription(lesson.videoUrl);
        transcription = await fetchCloudinaryTranscription(lesson.videoUrl, CLOUDINARY_TRANSCRIPTION_LANG);
      }
    } else {
      if (!String(lesson.content || "").trim()) {
        void import("./lesson-summary.service")
          .then(({ lessonSummaryService }) => lessonSummaryService.tryApplyBunnyDescriptionIfEmpty(lessonId))
          .catch((error) => {
            console.warn(
              `[Summary] Falha ao buscar descrição do vídeo para aula ${lessonId}:`,
              error?.message || error,
            );
          });
      }

      captionUrl = await fetchBunnyCaptionUrl(lesson.videoUrl, BUNNY_TRANSCRIPTION_LANG);
      transcription = await fetchBunnyTranscription(lesson.videoUrl, BUNNY_TRANSCRIPTION_LANG);
    }

    if (!transcription?.length) {
      return {
        status: "pending",
        captionUrl,
        transcription: Array.isArray(lesson.transcription) ? lesson.transcription : [],
      };
    }

    const previousCount = Array.isArray(lesson.transcription) ? lesson.transcription.length : 0;

    const lines = transcription.map(({ time, text, seconds }) => ({
      time,
      text,
      seconds,
    }));

    await courseRepository.updateLesson(lessonId, {
      transcription: lines,
    });

    if (previousCount === 0) {
      void import("./lesson-summary.service")
        .then(({ lessonSummaryService }) => lessonSummaryService.autoGenerateSummaryIfEmpty(lessonId))
        .catch((error) => {
          console.warn(
            `[Summary] Falha ao enfileirar resumo automático da aula ${lessonId}:`,
            error?.message || error,
          );
        });
    }

    return {
      status: "ready",
      transcription: lines,
      captionUrl,
    };
  }

  private async requestCloudinaryTranscription(videoUrl: string): Promise<void> {
    const ref = parseCloudinaryVideoUrl(videoUrl);
    if (!ref) return;

    try {
      await cloudinary.uploader.explicit(ref.publicId, {
        resource_type: "video",
        type: "upload",
        raw_convert: getTranscriptionRawConvert(CLOUDINARY_TRANSCRIPTION_LANG),
      });
    } catch (error: any) {
      console.warn("[Transcription] Não foi possível solicitar google_speech:", error?.message || error);
    }
  }

  scheduleLessonTranscriptionSync(lessonId: string, videoUrl?: string | null): void {
    if (!videoUrl) return;

    const provider = resolveTranscriptionProvider(videoUrl);
    if (!provider) return;

    if (provider === "cloudinary") {
      void this.requestCloudinaryTranscription(videoUrl)
        .then(() => {
          console.log(`[Transcription] Solicitação Cloudinary em segundo plano para aula ${lessonId}`);
        })
        .catch((error) => {
          console.warn(
            `[Transcription] Falha ao solicitar transcrição Cloudinary da aula ${lessonId}:`,
            error?.message || error,
          );
        });
    } else {
      console.log(`[Transcription] Aguardando legendas automáticas para aula ${lessonId}`);
    }

    const pollDelaysMs = provider === "bunny"
      ? [
        30_000, 60_000, 90_000, 120_000, 180_000, 300_000, 420_000, 600_000,
        900_000, 1_200_000, 1_800_000, 2_400_000, 3_600_000,
      ]
      : [20_000, 60_000, 120_000, 300_000, 600_000, 900_000];

    for (const delay of pollDelaysMs) {
      setTimeout(() => {
        this.syncLessonTranscription(lessonId)
          .then(async (result) => {
            if (provider === "bunny") {
              const { lessonSummaryService } = await import("./lesson-summary.service");
              await lessonSummaryService.tryApplyBunnyDescriptionIfEmpty(lessonId).catch(() => false);
            }

            if (provider !== "bunny" || result.status === "ready") return;
            const videoId = parseBunnyStreamVideoId(videoUrl);
            if (!videoId) return;
            const video = await getBunnyVideoDetails(videoId);
            if (video && !isBunnyVideoReadyForCaptions(video)) {
              console.log(
                `[Transcription] Aula ${lessonId} ainda codificando (${video.encodeProgress ?? 0}%)`,
              );
            }
          })
          .catch((error) => {
            console.warn(
              `[Transcription] Poll (${delay}ms) aula ${lessonId}:`,
              error?.message || error,
            );
          });
      }, delay);
    }
  }
}

export const lessonTranscriptionService = new LessonTranscriptionService();
