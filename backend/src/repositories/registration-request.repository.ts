import { RegistrationRequestStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

const publicRequestSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  message: true,
  status: true,
  createdAt: true,
} as const;

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
      select: publicRequestSelect,
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

  async markRejected(id: string) {
    return prisma.patientRegistrationRequest.update({
      where: { id },
      data: { status: RegistrationRequestStatus.RECUSADO },
    });
  }

  async create(data: {
    name: string;
    email: string;
    phone?: string | null;
    message?: string | null;
    passwordHash: string;
  }) {
    return prisma.patientRegistrationRequest.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        message: data.message || null,
        passwordHash: data.passwordHash,
      },
      select: publicRequestSelect,
    });
  }
}
