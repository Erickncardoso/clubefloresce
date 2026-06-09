import { Role, UserStatus } from "@prisma/client";
import { RegistrationRequestRepository } from "../repositories/registration-request.repository";
import { UserRepository } from "../repositories/user.repository";

const requestRepo = new RegistrationRequestRepository();
const userRepo = new UserRepository();

export class RegistrationRequestService {
  async createPatientRequest(data: {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
  }) {
    const name = data.name?.trim();
    const email = data.email?.trim().toLowerCase();
    const phone = data.phone?.trim() || null;
    const message = data.message?.trim() || null;

    if (!name || name.length < 2) {
      throw new Error("Informe seu nome completo.");
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Informe um e-mail válido.");
    }

    if (phone && phone.length > 30) {
      throw new Error("Telefone inválido.");
    }

    if (message && message.length > 1000) {
      throw new Error("A mensagem deve ter no máximo 1000 caracteres.");
    }

    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
      if (existingUser.role === Role.NUTRICIONISTA) {
        throw new Error("Este e-mail já está em uso.");
      }
      if (existingUser.status === UserStatus.ATIVO) {
        throw new Error("Já existe uma conta ativa com este e-mail. Faça login.");
      }
    }

    const pending = await requestRepo.findPendingByEmail(email);
    if (pending) {
      throw new Error("Já recebemos sua solicitação. Aguarde o retorno da nutricionista.");
    }

    return requestRepo.create({ name, email, phone, message });
  }

  async listPendingRequests() {
    return requestRepo.findAllPending();
  }

  async approveByEmail(email: string) {
    const pending = await requestRepo.findPendingByEmail(email);
    if (!pending) return null;
    return requestRepo.markApproved(pending.id);
  }
}
