import { PrismaClient, Prisma } from "@prisma/client";
import type { OrchestratorMeta } from "../services/bella/types";
import { normalizeTopic } from "../services/bella/topics";

const prisma = new PrismaClient();

export class BellaRepository {
  async findRecentByUser(userId: string, topic?: string, limit = 40) {
    const normalizedTopic = normalizeTopic(topic);
    return prisma.bellaMessage.findMany({
      where: { userId, topic: normalizedTopic },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async create(
    userId: string,
    role: "user" | "assistant",
    content: string,
    options?: { topic?: string; metadata?: OrchestratorMeta | Record<string, unknown> },
  ) {
    const metadata = options?.metadata
      ? (options.metadata as unknown as Prisma.InputJsonValue)
      : undefined;

    return prisma.bellaMessage.create({
      data: {
        userId,
        role,
        content,
        topic: normalizeTopic(options?.topic),
        ...(metadata ? { metadata } : {}),
      },
    });
  }
}
