import { PrismaClient, RegistrationRequestStatus } from "@prisma/client";

const prisma = new PrismaClient();

export class RegistrationRequestRepository {
  async findPendingByEmail(email: string) {
    return prisma.patientRegistrationRequest.findFirst({
      where: {
        email,
        status: RegistrationRequestStatus.PENDENTE,
      },
    });
  }

  async findAllPending(limit = 50) {
    return prisma.patientRegistrationRequest.findMany({
      where: { status: RegistrationRequestStatus.PENDENTE },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async findById(id: string) {
    return prisma.patientRegistrationRequest.findUnique({ where: { id } });
  }

  async markApproved(id: string) {
    return prisma.patientRegistrationRequest.update({
      where: { id },
      data: { status: RegistrationRequestStatus.APROVADO },
    });
  }

  async create(data: {
    name: string;
    email: string;
    phone?: string | null;
    message?: string | null;
  }) {
    return prisma.patientRegistrationRequest.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        message: data.message || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });
  }
}
