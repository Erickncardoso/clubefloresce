import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class CheckInTemplateRepository {
  async count() {
    return prisma.checkInTemplate.count();
  }

  async findAllForNutri() {
    return prisma.checkInTemplate.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        _count: { select: { responses: true } },
      },
    });
  }

  async findActiveForPatients() {
    return prisma.checkInTemplate.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async findById(id: string) {
    return prisma.checkInTemplate.findUnique({ where: { id } });
  }

  async create(data: {
    title: string;
    description?: string | null;
    frequency: string;
    active: boolean;
    steps: Prisma.InputJsonValue;
    sortOrder: number;
    isDefault?: boolean;
    authorId: string;
  }) {
    return prisma.checkInTemplate.create({ data });
  }

  async update(id: string, data: Record<string, unknown>) {
    return prisma.checkInTemplate.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.checkInTemplate.delete({ where: { id } });
  }

  async upsertResponse(data: {
    userId: string;
    templateId: string;
    periodKey: string;
    answers: Prisma.InputJsonValue;
  }) {
    return prisma.checkInResponse.upsert({
      where: {
        userId_templateId_periodKey: {
          userId: data.userId,
          templateId: data.templateId,
          periodKey: data.periodKey,
        },
      },
      create: data,
      update: { answers: data.answers },
      include: {
        template: { select: { id: true, title: true, frequency: true } },
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });
  }

  async findResponsesForNutri(limit = 100) {
    return prisma.checkInResponse.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        template: { select: { id: true, title: true, frequency: true } },
        user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
      },
    });
  }

  async findResponsesByUser(userId: string, limit = 24) {
    return prisma.checkInResponse.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        template: { select: { id: true, title: true, frequency: true } },
      },
    });
  }

  async findResponse(userId: string, templateId: string, periodKey: string) {
    return prisma.checkInResponse.findUnique({
      where: {
        userId_templateId_periodKey: { userId, templateId, periodKey },
      },
    });
  }
}
