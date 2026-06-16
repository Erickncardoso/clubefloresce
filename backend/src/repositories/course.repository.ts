import { PrismaClient, Course, Module, Lesson } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { isUuid } from "../utils/slug";
import { findModuleBySlug } from "../utils/module-slug";

const moduleInclude = (userId?: string) => ({
  lessons: {
    orderBy: { order: "asc" as const },
    include: {
      progress: userId ? { where: { userId } } : false,
    },
  },
  course: {
    include: {
      modules: {
        select: { id: true, title: true, order: true },
        orderBy: { order: "asc" as const },
      },
    },
  },
});

export class CourseRepository {
  async findAll(): Promise<Course[]> {
    return prisma.course.findMany({
      include: { modules: { include: { lessons: true } } },
    });
  }

  async findById(id: string): Promise<Course | null> {
    return prisma.course.findUnique({
      where: { id },
      include: { modules: { include: { lessons: true } } },
    });
  }

  async getCourseAuthorIdByModuleId(moduleId: string): Promise<string | null> {
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { course: { select: { authorId: true } } },
    });
    return module?.course?.authorId ?? null;
  }

  async getCourseAuthorIdByLessonId(lessonId: string): Promise<string | null> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { module: { select: { course: { select: { authorId: true } } } } },
    });
    return lesson?.module?.course?.authorId ?? null;
  }

  async findModuleById(id: string, userId?: string, courseId?: string): Promise<any | null> {
    const param = String(id || "").trim();
    if (!param) return null;

    if (isUuid(param)) {
      return prisma.module.findUnique({
        where: { id: param },
        include: moduleInclude(userId),
      });
    }

    if (courseId && isUuid(courseId)) {
      const courseModules = await prisma.module.findMany({
        where: { courseId },
        include: moduleInclude(userId),
        orderBy: { order: "asc" },
      });
      return findModuleBySlug(courseModules, param);
    }

    const modules = await prisma.module.findMany({
      include: moduleInclude(userId),
      orderBy: [{ courseId: "asc" }, { order: "asc" }],
    });

    const grouped = new Map<string, typeof modules>();
    for (const module of modules) {
      const list = grouped.get(module.courseId) || [];
      list.push(module);
      grouped.set(module.courseId, list);
    }

    let match: (typeof modules)[number] | null = null;
    for (const courseModules of grouped.values()) {
      const found = findModuleBySlug(courseModules, param);
      if (!found) continue;
      if (match) return null;
      match = found;
    }

    return match;
  }

  async updateLessonProgress(userId: string, lessonId: string, data: { watched?: boolean, liked?: boolean, disliked?: boolean, favorited?: boolean }): Promise<any> {
    return prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId, lessonId }
      },
      update: data,
      create: {
        userId,
        lessonId,
        ...data
      }
    });
  }

  async create(data: any): Promise<Course> {
    console.log('[CourseRepository] Dados recebidos para criação:', JSON.stringify(data, null, 2));
    try {
      const course = await prisma.course.create({
        data: {
          title: data.title,
          description: data.description || null,
          thumbnail: data.thumbnail || null,
          thumbnailMobile: data.thumbnailMobile || null,
          bannerImage: data.bannerImage || null,
          bannerImageMobile: data.bannerImageMobile || null,
          bannerImagePosition: data.bannerImagePosition || null,
          bannerImageMobilePosition: data.bannerImageMobilePosition || null,
          bannerKicker: data.bannerKicker || null,
          bannerTitle: data.bannerTitle || null,
          bannerSubtitle: data.bannerSubtitle || null,
          bannerCtaText: data.bannerCtaText || null,
          bannerKickerColor: data.bannerKickerColor || null,
          bannerKickerBg: data.bannerKickerBg || null,
          bannerTitleColor: data.bannerTitleColor || null,
          bannerSubtitleColor: data.bannerSubtitleColor || null,
          bannerCtaBg: data.bannerCtaBg || null,
          bannerCtaColor: data.bannerCtaColor || null,
          bannerSecondaryBtnBg: data.bannerSecondaryBtnBg || null,
          bannerSecondaryBtnColor: data.bannerSecondaryBtnColor || null,
          authorId: data.authorId,
        },
      });
      console.log('[CourseRepository] Curso criado com sucesso:', course.id);
      return course;
    } catch (error: any) {
      console.error('[CourseRepository] Erro ao criar curso no Prisma:', error);
      throw error;
    }
  }

  async update(id: string, data: any): Promise<Course> {
    const safeData = {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.thumbnail !== undefined ? { thumbnail: data.thumbnail } : {}),
      ...(data.thumbnailMobile !== undefined ? { thumbnailMobile: data.thumbnailMobile } : {}),
      ...(data.bannerImage !== undefined ? { bannerImage: data.bannerImage } : {}),
      ...(data.bannerImageMobile !== undefined ? { bannerImageMobile: data.bannerImageMobile } : {}),
      ...(data.bannerImagePosition !== undefined ? { bannerImagePosition: data.bannerImagePosition } : {}),
      ...(data.bannerImageMobilePosition !== undefined ? { bannerImageMobilePosition: data.bannerImageMobilePosition } : {}),
      ...(data.bannerKicker !== undefined ? { bannerKicker: data.bannerKicker } : {}),
      ...(data.bannerTitle !== undefined ? { bannerTitle: data.bannerTitle } : {}),
      ...(data.bannerSubtitle !== undefined ? { bannerSubtitle: data.bannerSubtitle } : {}),
      ...(data.bannerCtaText !== undefined ? { bannerCtaText: data.bannerCtaText } : {}),
      ...(data.bannerKickerColor !== undefined ? { bannerKickerColor: data.bannerKickerColor } : {}),
      ...(data.bannerKickerBg !== undefined ? { bannerKickerBg: data.bannerKickerBg } : {}),
      ...(data.bannerTitleColor !== undefined ? { bannerTitleColor: data.bannerTitleColor } : {}),
      ...(data.bannerSubtitleColor !== undefined ? { bannerSubtitleColor: data.bannerSubtitleColor } : {}),
      ...(data.bannerCtaBg !== undefined ? { bannerCtaBg: data.bannerCtaBg } : {}),
      ...(data.bannerCtaColor !== undefined ? { bannerCtaColor: data.bannerCtaColor } : {}),
      ...(data.bannerSecondaryBtnBg !== undefined ? { bannerSecondaryBtnBg: data.bannerSecondaryBtnBg } : {}),
      ...(data.bannerSecondaryBtnColor !== undefined ? { bannerSecondaryBtnColor: data.bannerSecondaryBtnColor } : {}),
    };

    return prisma.course.update({
      where: { id },
      data: safeData,
    });
  }

  async delete(id: string): Promise<Course> {
    return prisma.course.delete({
      where: { id },
    });
  }

  // Modules
  async createModule(data: any): Promise<Module> {
    return prisma.module.create({
      data,
    });
  }

  async ensureFirstModule(courseId: string): Promise<Module> {
    const existingModule = await prisma.module.findFirst({
      where: { courseId },
      orderBy: { order: "asc" },
    });

    if (existingModule) {
      return existingModule;
    }

    return prisma.module.create({
      data: {
        courseId,
        title: "Módulo 1",
        description: "Módulo inicial criado automaticamente para receber videoaulas.",
        order: 0,
      },
    });
  }

  async findLessonById(id: string): Promise<Lesson | null> {
    return prisma.lesson.findUnique({ where: { id } });
  }

  // Lessons
  async createLesson(data: any): Promise<Lesson> {
    console.log('[CourseRepository] Criando aula:', JSON.stringify(data, null, 2));
    return prisma.lesson.create({
      data,
    });
  }

  // Delete Module
  async deleteModule(id: string): Promise<Module> {
    return prisma.module.delete({
      where: { id },
    });
  }

  // Update Lesson
  async updateLesson(id: string, data: any): Promise<Lesson> {
    console.log(`[CourseRepository] Atualizando aula ${id}:`, JSON.stringify(data, null, 2));
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.videoUrl !== undefined) patch.videoUrl = data.videoUrl;
    if (data.content !== undefined) patch.content = data.content;
    if (data.duration !== undefined) patch.duration = data.duration;
    if (data.thumbnail !== undefined) patch.thumbnail = data.thumbnail;
    if (data.order !== undefined) patch.order = data.order;
    if (data.transcription !== undefined) patch.transcription = data.transcription;
    if (data.materials !== undefined) patch.materials = data.materials;

    return prisma.lesson.update({
      where: { id },
      data: patch,
    });
  }

  // Delete Lesson
  async deleteLesson(id: string): Promise<Lesson> {
    return prisma.lesson.delete({
      where: { id },
    });
  }

  // Lesson Comments
  async getLessonComments(lessonId: string): Promise<any[]> {
    return prisma.comment.findMany({
      where: { lessonId },
      include: {
        author: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async createLessonComment(userId: string, lessonId: string, content: string): Promise<any> {
    return prisma.comment.create({
      data: {
        content,
        lessonId,
        authorId: userId,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } }
      }
    });
  }

  async updateComment(id: string, userId: string, content: string): Promise<any> {
    return prisma.comment.update({
      where: { id, authorId: userId },
      data: { content },
      include: {
        author: { select: { id: true, name: true, avatar: true } }
      }
    });
  }

  async deleteComment(id: string, userId: string): Promise<any> {
    return prisma.comment.delete({
      where: { id, authorId: userId }
    });
  }

  async toggleCommentLike(userId: string, commentId: string): Promise<any> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { likedBy: { where: { id: userId } } }
    });

    if (!comment) throw new Error('Comentário não encontrado');

    const isLiked = comment.likedBy.length > 0;

    if (isLiked) {
      return prisma.comment.update({
        where: { id: commentId },
        data: {
          likesCount: { decrement: 1 },
          likedBy: { disconnect: { id: userId } }
        }
      });
    } else {
      return prisma.comment.update({
        where: { id: commentId },
        data: {
          likesCount: { increment: 1 },
          likedBy: { connect: { id: userId } }
        }
      });
    }
  }
}


