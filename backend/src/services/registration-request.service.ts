import bcrypt from "bcrypt";
import { Role, UserStatus, RegistrationRequestStatus } from "@prisma/client";
import { RegistrationRequestRepository } from "../repositories/registration-request.repository";
import { UserRepository } from "../repositories/user.repository";

const requestRepo = new RegistrationRequestRepository();
const userRepo = new UserRepository();
const MIN_PASSWORD_LENGTH = 8;

export class RegistrationRequestService {
  private validatePassword(password: string, passwordConfirm?: string) {
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }

    if (passwordConfirm !== undefined && password !== passwordConfirm) {
      throw new Error("As senhas não coincidem.");
    }
  }

  async createPatientRequest(data: {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    password?: string;
    passwordConfirm?: string;
  }) {
    const name = data.name?.trim();
    const email = data.email?.trim().toLowerCase();
    const phone = data.phone?.trim() || null;
    const message = data.message?.trim() || null;
    const password = data.password || "";
    const passwordConfirm = data.passwordConfirm ?? data.password ?? "";

    if (!name || name.length < 2) {
      throw new Error("Informe seu nome completo.");
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Informe um e-mail válido.");
    }

    this.validatePassword(password, passwordConfirm);

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

    const passwordHash = await bcrypt.hash(password, 10);

    return requestRepo.create({ name, email, phone, message, passwordHash });
  }

  async listPendingRequests() {
    return requestRepo.findAllPending();
  }

  async getRequestForApproval(id: string) {
    const request = await requestRepo.findById(id);
    if (!request || request.status !== RegistrationRequestStatus.PENDENTE) {
      return null;
    }
    return request;
  }

  async approveByEmail(email: string) {
    const pending = await requestRepo.findPendingByEmail(email);
    if (!pending) return null;
    return requestRepo.markApproved(pending.id);
  }
}
