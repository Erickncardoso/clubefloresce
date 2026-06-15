import { PrismaClient, Prisma } from "@prisma/client";
import type { OrchestratorMeta } from "../services/bella/types";
import { normalizeTopic } from "../services/bella/topics";

const prisma = new PrismaClient();

export class BellaRepository {
  async findRecentByUser(userId: string, topic?: string, limit = 40) {
    const normalizedTopic = normalizeTopic(topic);
    const rows = await prisma.bellaMessage.findMany({
      where: { userId, topic: normalizedTopic },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.reverse();
  }

  async findById(id: string) {
    return prisma.bellaMessage.findUnique({ where: { id } });
  }

  async resolvePendingRestaurantIntent(userId: string, relatedUserMessageId: string) {
    const rows = await prisma.bellaMessage.findMany({
      where: { userId, topic: "restaurant", role: "assistant" },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    for (const row of rows) {
      const meta = (row.metadata || {}) as Record<string, unknown>;
      if (meta.pendingRestaurantIntent && meta.relatedUserMessageId === relatedUserMessageId) {
        await prisma.bellaMessage.update({
          where: { id: row.id },
          data: {
            metadata: {
              ...meta,
              pendingRestaurantIntent: false,
              resolvedRestaurantIntent: true,
            } as unknown as Prisma.InputJsonValue,
          },
        });
      }
    }
  }

  async resolvePendingSwapSelection(userId: string, messageId: string) {
    const row = await prisma.bellaMessage.findFirst({
      where: { id: messageId, userId, role: "assistant" },
    });
    if (!row) return;

    const meta = (row.metadata || {}) as Record<string, unknown>;
    if (!meta.pendingSwapSelection) return;

    await prisma.bellaMessage.update({
      where: { id: row.id },
      data: {
        metadata: {
          ...meta,
          pendingSwapSelection: false,
          resolvedSwapSelection: true,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async resolvePendingSwapMode(userId: string, messageId: string) {
    const row = await prisma.bellaMessage.findFirst({
      where: { id: messageId, userId, role: "assistant" },
    });
    if (!row) return;

    const meta = (row.metadata || {}) as Record<string, unknown>;
    if (!meta.pendingSwapMode) return;

    await prisma.bellaMessage.update({
      where: { id: row.id },
      data: {
        metadata: {
          ...meta,
          pendingSwapMode: false,
          resolvedSwapMode: true,
        } as unknown as Prisma.InputJsonValue,
      },
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
