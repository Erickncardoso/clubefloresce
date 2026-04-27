import { PrismaClient, User, Role } from "@prisma/client";

const prisma = new PrismaClient();

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: any): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  async update(id: string, data: any): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async findAll(): Promise<User[]> {
    return prisma.user.findMany();
  }
}
