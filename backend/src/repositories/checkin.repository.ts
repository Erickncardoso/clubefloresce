import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class CheckInRepository {
  async findByUserAndWeek(userId: string, weekStart: Date) {
    return prisma.weeklyCheckIn.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
    });
  }

  async upsert(data: {
    userId: string;
    weekStart: Date;
    mood: number;
    energy: number;
    adherence?: number | null;
    weightKg?: number | null;
    notes?: string | null;
  }) {
    return prisma.weeklyCheckIn.upsert({
      where: { userId_weekStart: { userId: data.userId, weekStart: data.weekStart } },
      create: data,
      update: {
        mood: data.mood,
        energy: data.energy,
        adherence: data.adherence,
        weightKg: data.weightKg,
        notes: data.notes,
      },
    });
  }

  async findHistoryByUser(userId: string, limit = 12) {
    return prisma.weeklyCheckIn.findMany({
      where: { userId },
      orderBy: { weekStart: "desc" },
      take: limit,
    });
  }

  async findRecentForNutri(limit = 50) {
    return prisma.weeklyCheckIn.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
      },
    });
  }
}
