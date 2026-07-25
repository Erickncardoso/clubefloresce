import { prisma } from "../lib/prisma";
import type { InstagramConfig } from "@prisma/client";

export class InstagramConfigRepository {
  async findByUserId(userId: string): Promise<InstagramConfig | null> {
    return prisma.instagramConfig.findUnique({ where: { userId } });
  }

  async findByInstagramUserId(instagramUserId: string): Promise<InstagramConfig | null> {
    return prisma.instagramConfig.findFirst({ where: { instagramUserId } });
  }

  /** Qualquer config conectada — app single-nutri: eventos sem destinatário claro caem aqui. */
  async findFirst(): Promise<InstagramConfig | null> {
    return prisma.instagramConfig.findFirst({ orderBy: { createdAt: "asc" } });
  }

  async upsert(data: {
    userId: string;
    accessToken: string;
    tokenExpiresAt: Date;
    instagramUserId: string;
    instagramUsername: string;
    profilePictureUrl?: string | null;
  }): Promise<InstagramConfig> {
    return prisma.instagramConfig.upsert({
      where: { userId: data.userId },
      create: data,
      update: {
        accessToken: data.accessToken,
        tokenExpiresAt: data.tokenExpiresAt,
        instagramUserId: data.instagramUserId,
        instagramUsername: data.instagramUsername,
        profilePictureUrl: data.profilePictureUrl,
      },
    });
  }

  async updateToken(userId: string, accessToken: string, tokenExpiresAt: Date): Promise<void> {
    await prisma.instagramConfig.update({
      where: { userId },
      data: { accessToken, tokenExpiresAt },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.instagramConfig.deleteMany({ where: { userId } });
  }

  async listAll(): Promise<InstagramConfig[]> {
    return prisma.instagramConfig.findMany();
  }
}
