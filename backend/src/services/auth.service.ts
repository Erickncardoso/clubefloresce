import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/user.repository";
import { PasswordResetRepository } from "../repositories/password-reset.repository";
import { RegistrationRequestRepository } from "../repositories/registration-request.repository";
import { Role, UserStatus } from "@prisma/client";
import { getJwtSecret } from "../utils/jwt";
import { isPatientAccessExpired } from "../utils/access-expires";
import { cloudinaryUpload } from "../utils/cloudinary";
import {
  buildPasswordResetUrl,
  type PasswordResetApp,
} from "../utils/email-config";
import {
  createPasswordResetToken,
  getPasswordResetTtlMs,
  hashPasswordResetToken,
} from "../utils/password-reset-token";
import { dispatchEmail, emailService } from "./email/email.service";

const userRepository = new UserRepository();
const passwordResetRepository = new PasswordResetRepository();
const registrationRequestRepository = new RegistrationRequestRepository();

const PATIENT_TOKEN_TTL = "90d";
const STAFF_TOKEN_TTL = "30d";
const REFRESH_GRACE_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

type TokenUser = { id: string; email: string; role: Role };

export class AuthService {
  private issueToken(user: TokenUser): string {
    const expiresIn = user.role === Role.PACIENTE ? PATIENT_TOKEN_TTL : STAFF_TOKEN_TTL;
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn },
    );
  }

  private decodeTokenAllowingGrace(currentToken: string): TokenUser {
    try {
      return jwt.verify(currentToken, getJwtSecret()) as TokenUser;
    } catch (err: any) {
      if (err?.name !== "TokenExpiredError") {
        throw new Error("Token inválido.");
      }

      const decoded = jwt.verify(currentToken, getJwtSecret(), {
        ignoreExpiration: true,
      }) as TokenUser & { exp?: number };

      const expiredAtMs = (decoded.exp ?? 0) * 1000;
      if (!expiredAtMs || Date.now() - expiredAtMs > REFRESH_GRACE_MS) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      return decoded;
    }
  }

  private ensureSetupKey(providedKey?: string): void {
    const requiredKey = process.env.NUTRI_SETUP_KEY;
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction && !requiredKey) {
      throw new Error("Configuração inválida: defina NUTRI_SETUP_KEY em produção.");
    }

    if (!requiredKey) {
      return;
    }

    if (!providedKey || providedKey !== requiredKey) {
      throw new Error("Chave de setup inválida.");
    }
  }

  private validatePassword(password: string): void {
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }
  }

  private async hasNutritionistAccount(): Promise<boolean> {
    const users = await userRepository.findAll();
    return users.some((user) => user.role === Role.NUTRICIONISTA);
  }

  async getOneTimeNutritionistSetupStatus(): Promise<{ enabled: boolean }> {
    const alreadyHasNutritionist = await this.hasNutritionistAccount();
    return { enabled: !alreadyHasNutritionist };
  }

  async registerFirstNutritionist(data: any, setupKey?: string): Promise<any> {
    this.ensureSetupKey(setupKey);

    const alreadyHasNutritionist = await this.hasNutritionistAccount();
    if (alreadyHasNutritionist) {
      throw new Error("Setup já utilizado. Já existe nutricionista cadastrado.");
    }

    if (!data?.name || !data?.email || !data?.password) {
      throw new Error("Nome, e-mail e senha são obrigatórios.");
    }

    return this.createUser({
      name: String(data.name).trim(),
      email: String(data.email).trim().toLowerCase(),
      password: data.password,
      role: Role.NUTRICIONISTA,
      status: UserStatus.PENDENTE,
    });
  }

  private async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    status: UserStatus;
  }): Promise<any> {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error("Usuário já cadastrado.");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await userRepository.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
      status: data.status,
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(email: string, passwordText: string): Promise<any> {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      const pendingRegistration = await registrationRequestRepository.findPendingByEmail(normalizedEmail);
      if (pendingRegistration) {
        throw new Error(
          "Seu cadastro ainda está em análise. Você receberá um e-mail quando sua conta for liberada.",
        );
      }
      throw new Error("Credenciais inválidas.");
    }

    if (user.status === UserStatus.INATIVO) {
      throw new Error("Conta desativada. Entre em contato com o suporte.");
    }

    if (user.role === Role.PACIENTE && isPatientAccessExpired(user.accessExpiresAt)) {
      throw new Error("Seu acesso ao Clube Florescer expirou. Entre em contato com a nutricionista.");
    }

    const isMatch = await bcrypt.compare(passwordText, user.password);
    if (!isMatch) {
      throw new Error("Credenciais inválidas.");
    }

    const token = this.issueToken(user);

    const { password, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token,
      mustChangePassword: user.status === UserStatus.PENDENTE,
    };
  }

  async refreshSession(currentToken: string): Promise<{ token: string; user: any }> {
    const decoded = this.decodeTokenAllowingGrace(currentToken);
    const user = await userRepository.findById(decoded.id);

    if (!user) {
      throw new Error("Sessão expirada ou usuário inválido. Faça login novamente.");
    }

    if (user.status === UserStatus.INATIVO) {
      throw new Error("Conta desativada. Entre em contato com o suporte.");
    }

    if (user.role === Role.PACIENTE && isPatientAccessExpired(user.accessExpiresAt)) {
      throw new Error("Seu acesso ao Clube Florescer expirou. Entre em contato com a nutricionista.");
    }

    const token = this.issueToken(user);
    const { password, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  async findById(id: string): Promise<any> {
    return userRepository.findById(id);
  }

  async changePasswordOnFirstAccess(userId: string, newPassword: string): Promise<any> {
    this.validatePassword(newPassword);

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    if (user.status !== UserStatus.PENDENTE) {
      throw new Error("Troca de senha de primeiro acesso não é necessária.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await userRepository.update(userId, {
      password: hashedPassword,
      status: UserStatus.ATIVO,
    });

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async updateAvatar(
    userId: string,
    file: { buffer: Buffer; mimetype: string; size: number },
  ): Promise<any> {
    if (!file.mimetype.startsWith("image/")) {
      throw new Error("Envie uma imagem válida (JPG, PNG ou WEBP).");
    }

    const avatarUrl = await cloudinaryUpload(file.buffer, "clube-patient-avatars", {
      resourceType: "image",
      fileSizeBytes: file.size,
      errorKind: "image",
    });

    const updatedUser = await userRepository.update(userId, { avatar: avatarUrl });
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async requestPasswordReset(email: string, app: PasswordResetApp): Promise<void> {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("Informe um e-mail válido.");
    }

    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user || user.status === UserStatus.INATIVO) {
      return;
    }

    if (app === "admin" && user.role !== Role.NUTRICIONISTA) {
      return;
    }

    if (app === "patient" && user.role !== Role.PACIENTE) {
      return;
    }

    const rawToken = createPasswordResetToken();
    const tokenHash = hashPasswordResetToken(rawToken);
    const expiresAt = new Date(Date.now() + getPasswordResetTtlMs());

    await passwordResetRepository.replaceForUser(user.id, tokenHash, expiresAt);

    const resetUrl = buildPasswordResetUrl(app, rawToken);
    dispatchEmail(
      emailService.sendPasswordReset({
        name: user.name,
        email: user.email,
        resetUrl,
      }),
      "password-reset",
    );
  }

  async validatePasswordResetToken(token: string): Promise<{ valid: true }> {
    const record = await this.findValidPasswordResetRecord(token);
    if (!record) {
      throw new Error("Link inválido ou expirado. Solicite um novo e-mail de recuperação.");
    }
    return { valid: true };
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    this.validatePassword(newPassword);

    const record = await this.findValidPasswordResetRecord(token);
    if (!record) {
      throw new Error("Link inválido ou expirado. Solicite um novo e-mail de recuperação.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userRepository.update(record.userId, { password: hashedPassword });
    await passwordResetRepository.markUsed(record.id);
    await passwordResetRepository.deleteByUserId(record.userId);
  }

  private async findValidPasswordResetRecord(token: string) {
    const normalizedToken = String(token || "").trim();
    if (!normalizedToken) return null;
    return passwordResetRepository.findValidByTokenHash(
      hashPasswordResetToken(normalizedToken),
    );
  }
}
