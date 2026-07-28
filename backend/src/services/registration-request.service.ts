import bcrypt from "bcrypt";
import { Role, UserPlan, UserStatus, RegistrationRequestStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { RegistrationRequestRepository } from "../repositories/registration-request.repository";
import { UserRepository } from "../repositories/user.repository";
import { dispatchEmail, emailService } from "./email/email.service";
import { getPatientCheckoutOpenUrl } from "../utils/email-config";
import { isValidWhatsappPhone } from "../utils/phone";
import {
  dispatchRegistrationCheckoutWhatsapp,
  registrationCheckoutWhatsappService,
} from "./registration-checkout-whatsapp.service";

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

  async registerPatientSelfCheckout(data: {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    password?: string;
    passwordConfirm?: string;
  }) {
    const name = data.name?.trim();
    const email = data.email?.trim().toLowerCase();
    const phoneRaw = data.phone?.trim() || "";
    const message = data.message?.trim() || null;
    const password = data.password || "";
    const passwordConfirm = data.passwordConfirm ?? data.password ?? "";

    if (!name || name.length < 2) {
      throw new Error("Informe seu nome completo.");
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Informe um e-mail válido.");
    }

    if (!phoneRaw) {
      throw new Error("Informe seu WhatsApp.");
    }

    if (!isValidWhatsappPhone(phoneRaw)) {
      throw new Error("Informe um WhatsApp válido com DDD.");
    }

    this.validatePassword(password, passwordConfirm);

    const existingUser = await userRepo.findByEmail(email);
    if (existingUser?.role === Role.NUTRICIONISTA) {
      throw new Error("Este e-mail já está em uso.");
    }
    if (existingUser?.status === UserStatus.ATIVO && existingUser.role === Role.PACIENTE) {
      throw new Error("Já existe uma conta com este e-mail. Faça login.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user;
    if (existingUser) {
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          phone: phoneRaw,
          password: passwordHash,
          role: Role.PACIENTE,
          status: UserStatus.ATIVO,
          plan: UserPlan.FREE,
          accessExpiresAt: null,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name,
          email,
          phone: phoneRaw,
          password: passwordHash,
          role: Role.PACIENTE,
          status: UserStatus.ATIVO,
          plan: UserPlan.FREE,
          accessExpiresAt: null,
        },
      });
    }

    await prisma.patientRegistrationRequest.updateMany({
      where: { email, status: RegistrationRequestStatus.PENDENTE },
      data: { status: RegistrationRequestStatus.APROVADO },
    });

    await requestRepo.create({
      name,
      email,
      phone: phoneRaw,
      message,
      passwordHash,
      status: RegistrationRequestStatus.APROVADO,
    });

    const checkoutUrl = getPatientCheckoutOpenUrl("registration-email");

    dispatchEmail(
      emailService.sendRegistrationWelcomeCheckout({
        name,
        email,
        checkoutUrl,
      }),
      "boas-vindas checkout",
    );

    dispatchRegistrationCheckoutWhatsapp(
      registrationCheckoutWhatsappService.sendCheckoutLink({
        name,
        phone: phoneRaw,
      }),
    );

    dispatchEmail(
      emailService.sendNewPatientSignupToNutri({
        name,
        email,
        phone: phoneRaw,
      }),
      "nutri novo cadastro",
    );

    const { password: _pw, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /** Converte solicitação pendente (fluxo antigo) em conta ativa no login. */
  async activatePendingRegistrationIfValid(email: string, password: string) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const pending = await requestRepo.findPendingByEmail(normalizedEmail);
    if (!pending?.passwordHash) return null;

    const isMatch = await bcrypt.compare(password, pending.passwordHash);
    if (!isMatch) return null;

    const existingUser = await userRepo.findByEmail(normalizedEmail);
    if (existingUser) {
      await requestRepo.markApproved(pending.id);
      const { password: _pw, ...userWithoutPassword } = existingUser;
      return userWithoutPassword;
    }

    const user = await prisma.user.create({
      data: {
        name: pending.name,
        email: normalizedEmail,
        phone: pending.phone || null,
        password: pending.passwordHash,
        role: Role.PACIENTE,
        status: UserStatus.ATIVO,
        plan: UserPlan.FREE,
        accessExpiresAt: null,
      },
    });

    await requestRepo.markApproved(pending.id);

    const { password: _pw, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /** @deprecated fluxo antigo com aprovação manual — use registerPatientSelfCheckout */
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
    const phoneRaw = data.phone?.trim() || "";
    const message = data.message?.trim() || null;
    const password = data.password || "";
    const passwordConfirm = data.passwordConfirm ?? data.password ?? "";

    if (!name || name.length < 2) {
      throw new Error("Informe seu nome completo.");
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Informe um e-mail válido.");
    }

    if (!phoneRaw) {
      throw new Error("Informe seu WhatsApp.");
    }

    if (!isValidWhatsappPhone(phoneRaw)) {
      throw new Error("Informe um WhatsApp válido com DDD.");
    }

    this.validatePassword(password, passwordConfirm);

    if (phoneRaw.length > 30) {
      throw new Error("WhatsApp inválido.");
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

    const request = await requestRepo.create({ name, email, phone: phoneRaw, message, passwordHash });

    dispatchEmail(
      emailService.sendRegistrationRequestCreated({
        name,
        email,
        phone: phoneRaw,
        message,
      }),
      "solicitação de cadastro",
    );

    return request;
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

  async rejectRequest(id: string) {
    const request = await this.getRequestForApproval(id);
    if (!request) {
      throw new Error("Solicitação inválida ou já processada.");
    }

    await requestRepo.markRejected(id);

    dispatchEmail(
      emailService.sendRegistrationRejected({
        name: request.name,
        email: request.email,
      }),
      "reprovação de cadastro",
    );

    return request;
  }
}
