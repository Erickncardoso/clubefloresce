import { prisma } from "../lib/prisma";
import type { InstagramEvent, Prisma } from "@prisma/client";

export class InstagramEventRepository {
  async create(data: {
    userId?: string | null;
    field?: string | null;
    payload: Prisma.InputJsonValue;
  }): Promise<InstagramEvent> {
    return prisma.instagramEvent.create({
      data: { userId: data.userId ?? null, field: data.field ?? null, payload: data.payload },
    });
  }

  async listRecent(limit = 50): Promise<InstagramEvent[]> {
    return prisma.instagramEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
