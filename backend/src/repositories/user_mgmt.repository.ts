import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class UserMgmtRepository {
  async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateUserStatus(id: string, status: any) {
    return prisma.user.update({
      where: { id },
      data: { status }
    });
  }

  async deleteUser(id: string) {
    return prisma.user.delete({ where: { id } });
  }
}
