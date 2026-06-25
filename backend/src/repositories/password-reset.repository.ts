import { PasswordResetToken, User } from "@prisma/client";
import { prisma } from "../lib/prisma";

type PasswordResetWithUser = PasswordResetToken & { user: User };

export class PasswordResetRepository {
  async replaceForUser(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordResetToken> {
    return prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      return tx.passwordResetToken.create({
        data: { userId, tokenHash, expiresAt },
      });
    });
  }

  async findValidByTokenHash(tokenHash: string): Promise<PasswordResetWithUser | null> {
    return prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  async markUsed(id: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
  }
}
