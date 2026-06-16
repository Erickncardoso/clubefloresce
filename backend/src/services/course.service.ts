import { CourseRepository } from "../repositories/course.repository";
import { Course, Module, Lesson } from "@prisma/client";
import { lessonSummaryService, shouldScheduleLessonTranscriptionSync } from "./lesson-summary.service";
import { lessonTranscriptionService } from "./lesson-transcription.service";
import { fetchBunnyVideoPlayMetadata, invalidateBunnyVideoPlayMetadataCache } from "../utils/media/bunny-play-data";
import { parseBunnyStreamVideoId } from "../utils/media/bunny-config";

const courseRepository = new CourseRepository();

function normalizeLessonVideoUrl(videoUrl: unknown): string {
  const url = String(videoUrl || "").trim();
  if (!url) {
    throw new Error("URL do vídeo é obrigatória.");
  }
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("URL do vídeo inválida.");
  }
  return url;
}

export class CourseService {
  private async assertCourseOwner(courseId: string, userId: string): Promise<Course> {
    const course = await courseRepository.findById(courseId);
    if (!course) {
      throw new Error("Curso não encontrado.");
    }
    if (course.authorId !== userId) {
      throw new Error("Acesso negado.");
    }
    return course;
  }

  private async assertModuleOwner(moduleId: string, userId: string): Promise<void> {
    const authorId = await courseRepository.getCourseAuthorIdByModuleId(moduleId);
    if (!authorId) {
      throw new Error("Módulo não encontrado.");
    }
    if (authorId !== userId) {
      throw new Error("Acesso negado.");
    }
  }

  private async assertLessonOwner(lessonId: string, userId: string): Promise<void> {
    const authorId = await courseRepository.getCourseAuthorIdByLessonId(lessonId);
    if (!authorId) {
      throw new Error("Aula não encontrada.");
    }
    if (authorId !== userId) {
      throw new Error("Acesso negado.");
    }
  }

  async getAllCourses(): Promise<Course[]> {
    return courseRepository.findAll();
  }

  async getCourseById(id: string): Promise<Course | null> {
    return courseRepository.findById(id);
  }

  async getModuleById(
    id: string,
    userId?: string,
    courseId?: string,
    lessonSlug?: string,
  ): Promise<any | null> {
    if (lessonSlug) {
      const byLesson = await courseRepository.findModuleByLessonSlug(lessonSlug, userId);
      if (byLesson) return byLesson;
    }

    return courseRepository.findModuleById(id, userId, courseId);
  }

  async toggleProgress(userId: string, lessonId: string, data: any): Promise<any> {
    return courseRepository.updateLessonProgress(userId, lessonId, data);
  }

  async createCourse(data: any): Promise<Course> {
    return courseRepository.create(data);
  }

  async updateCourse(id: string, userId: string, data: any): Promise<Course> {
    await this.assertCourseOwner(id, userId);
    return courseRepository.update(id, data);
  }

  async addModule(courseId: string, userId: string, data: any): Promise<Module> {
    await this.assertCourseOwner(courseId, userId);
    return courseRepository.createModule({ ...data, courseId });
  }

  async ensureFirstModule(courseId: string, userId: string): Promise<Module> {
    await this.assertCourseOwner(courseId, userId);
    return courseRepository.ensureFirstModule(courseId);
  }

  async addLesson(userId: string, data: any): Promise<Lesson> {
    if (!data?.moduleId) {
      throw new Error("moduleId é obrigatório.");
    }
    await this.assertModuleOwner(data.moduleId, userId);
    const lesson = await courseRepository.createLesson({
      ...data,
      videoUrl: normalizeLessonVideoUrl(data.videoUrl),
    });
    if (shouldScheduleLessonTranscriptionSync(lesson.videoUrl)) {
      lessonTranscriptionService.scheduleLessonTranscriptionSync(lesson.id, lesson.videoUrl);
    }
    return lesson;
  }

  async deleteCourse(id: string, userId: string): Promise<Course> {
    await this.assertCourseOwner(id, userId);
    return courseRepository.delete(id);
  }

  async deleteModule(moduleId: string, userId: string): Promise<Module> {
    await this.assertModuleOwner(moduleId, userId);
    return courseRepository.deleteModule(moduleId);
  }

  async updateLesson(lessonId: string, userId: string, data: any): Promise<Lesson> {
    await this.assertLessonOwner(lessonId, userId);
    const previous = await courseRepository.findLessonById(lessonId);
    const patch = { ...data };
    if (data.videoUrl !== undefined) {
      patch.videoUrl = normalizeLessonVideoUrl(data.videoUrl);
    }
    const lesson = await courseRepository.updateLesson(lessonId, patch);
    const videoUrl = data.videoUrl ?? lesson.videoUrl;
    if (data.videoUrl !== undefined && videoUrl !== previous?.videoUrl) {
      const previousVideoId = parseBunnyStreamVideoId(String(previous?.videoUrl || ""));
      const nextVideoId = parseBunnyStreamVideoId(String(videoUrl || ""));
      await Promise.all([
        previousVideoId ? invalidateBunnyVideoPlayMetadataCache(previousVideoId) : Promise.resolve(),
        nextVideoId ? invalidateBunnyVideoPlayMetadataCache(nextVideoId) : Promise.resolve(),
      ]);
    }
    if (
      shouldScheduleLessonTranscriptionSync(videoUrl)
      && videoUrl !== previous?.videoUrl
    ) {
      lessonTranscriptionService.scheduleLessonTranscriptionSync(lessonId, videoUrl);
    }
    return lesson;
  }

  async syncLessonTranscription(lessonId: string, userId: string) {
    await this.assertLessonOwner(lessonId, userId);
    return lessonTranscriptionService.syncLessonTranscription(lessonId);
  }

  async generateLessonSummary(lessonId: string, userId: string) {
    await this.assertLessonOwner(lessonId, userId);
    return lessonSummaryService.generateSummary(lessonId);
  }

  async getLessonVideoMetadata(lessonId: string) {
    const lesson = await courseRepository.findLessonById(lessonId);
    if (!lesson?.videoUrl) {
      return { available: false };
    }

    const metadata = await fetchBunnyVideoPlayMetadata(String(lesson.videoUrl));
    if (!metadata) {
      return { available: false };
    }

    return {
      available: true,
      metadata,
    };
  }

  async deleteLesson(lessonId: string, userId: string): Promise<Lesson> {
    await this.assertLessonOwner(lessonId, userId);
    return courseRepository.deleteLesson(lessonId);
  }

  async getLessonComments(lessonId: string): Promise<any[]> {
    return courseRepository.getLessonComments(lessonId);
  }

  async addLessonComment(userId: string, lessonId: string, content: string): Promise<any> {
    return courseRepository.createLessonComment(userId, lessonId, content);
  }

  async updateComment(id: string, userId: string, content: string): Promise<any> {
    return courseRepository.updateComment(id, userId, content);
  }

  async deleteComment(id: string, userId: string): Promise<any> {
    return courseRepository.deleteComment(id, userId);
  }

  async toggleCommentLike(userId: string, commentId: string): Promise<any> {
    return courseRepository.toggleCommentLike(userId, commentId);
  }
}
