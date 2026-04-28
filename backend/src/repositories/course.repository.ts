import { PrismaClient, Course, Module, Lesson } from "@prisma/client";

const prisma = new PrismaClient();

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

  async findModuleById(id: string, userId?: string): Promise<any | null> {
    return prisma.module.findUnique({
      where: { id },
      include: { 
        lessons: { 
          orderBy: { order: 'asc' },
          include: {
            progress: userId ? { where: { userId } } : false
          }
        },
        course: { 
          include: {
            modules: {
              select: { id: true, title: true, order: true },
              orderBy: { order: 'asc' }
            }
          }
        } 
      },
    });
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
          bannerKicker: data.bannerKicker || null,
          bannerTitle: data.bannerTitle || null,
          bannerSubtitle: data.bannerSubtitle || null,
          bannerCtaText: data.bannerCtaText || null,
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
      ...(data.bannerKicker !== undefined ? { bannerKicker: data.bannerKicker } : {}),
      ...(data.bannerTitle !== undefined ? { bannerTitle: data.bannerTitle } : {}),
      ...(data.bannerSubtitle !== undefined ? { bannerSubtitle: data.bannerSubtitle } : {}),
      ...(data.bannerCtaText !== undefined ? { bannerCtaText: data.bannerCtaText } : {}),
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
    return prisma.lesson.update({
      where: { id },
      data: {
        title: data.title,
        videoUrl: data.videoUrl,
        duration: data.duration,
        thumbnail: data.thumbnail,
        order: data.order
      }
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


