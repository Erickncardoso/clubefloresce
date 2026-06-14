import { PrismaClient, Role, UserPlan, UserStatus } from "@prisma/client";

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
        accessExpiresAt: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        accessExpiresAt: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createPatient(data: {
    name: string;
    email: string;
    password: string;
    plan?: UserPlan;
    status?: UserStatus;
    accessExpiresAt?: Date | null;
  }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: Role.PACIENTE,
        plan: data.plan || UserPlan.FREE,
        status: data.status || UserStatus.ATIVO,
        accessExpiresAt: data.accessExpiresAt ?? null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        accessExpiresAt: true,
        createdAt: true,
      },
    });
  }

  async updatePatient(
    id: string,
    data: { name?: string; status?: UserStatus; plan?: UserPlan; accessExpiresAt?: Date | null },
  ) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        accessExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateUserStatus(id: string, status: UserStatus) {
    return prisma.user.update({
      where: { id },
      data: { status },
    });
  }

  async deleteUser(id: string) {
    return prisma.user.delete({ where: { id } });
  }
}
