import { v2 as cloudinary } from "cloudinary";
import { CourseRepository } from "../repositories/course.repository";
import {
  fetchCloudinaryCaptionUrl,
  fetchCloudinaryTranscription,
  getTranscriptionRawConvert,
  parseCloudinaryVideoUrl,
} from "../utils/cloudinary-transcription";

const courseRepository = new CourseRepository();
const TRANSCRIPTION_LANG = process.env.CLOUDINARY_TRANSCRIPTION_LANG || "pt-BR";

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

    const captionUrl = await fetchCloudinaryCaptionUrl(lesson.videoUrl, TRANSCRIPTION_LANG);
    let transcription = await fetchCloudinaryTranscription(lesson.videoUrl, TRANSCRIPTION_LANG);

    if (!transcription?.length) {
      await this.requestCloudinaryTranscription(lesson.videoUrl);
      transcription = await fetchCloudinaryTranscription(lesson.videoUrl, TRANSCRIPTION_LANG);
    }

    if (!transcription?.length) {
      return {
        status: "pending",
        captionUrl,
        transcription: Array.isArray(lesson.transcription) ? lesson.transcription : [],
      };
    }

    const lines = transcription.map(({ time, text, seconds }) => ({
      time,
      text,
      seconds,
    }));

    await courseRepository.updateLesson(lessonId, {
      transcription: lines,
    });

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
        raw_convert: getTranscriptionRawConvert(TRANSCRIPTION_LANG),
      });
    } catch (error: any) {
      console.warn("[Transcription] Não foi possível solicitar google_speech:", error?.message || error);
    }
  }

  scheduleLessonTranscriptionSync(lessonId: string, videoUrl?: string | null): void {
    if (!videoUrl || !videoUrl.includes("res.cloudinary.com")) return;

    void this.requestCloudinaryTranscription(videoUrl)
      .then(() => {
        console.log(`[Transcription] Solicitação em segundo plano para aula ${lessonId}`);
      })
      .catch((error) => {
        console.warn(
          `[Transcription] Falha ao solicitar transcrição da aula ${lessonId}:`,
          error?.message || error,
        );
      });

    const pollDelaysMs = [20_000, 60_000, 120_000, 300_000, 600_000];
    for (const delay of pollDelaysMs) {
      setTimeout(() => {
        this.syncLessonTranscription(lessonId).catch((error) => {
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
