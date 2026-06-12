import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/user.repository";
import { Role, UserStatus } from "@prisma/client";

const userRepository = new UserRepository();

const PATIENT_TOKEN_TTL = "90d";
const STAFF_TOKEN_TTL = "30d";
const REFRESH_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

type TokenUser = { id: string; email: string; role: Role };

export class AuthService {
  private issueToken(user: TokenUser): string {
    const expiresIn = user.role === Role.PACIENTE ? PATIENT_TOKEN_TTL : STAFF_TOKEN_TTL;
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn },
    );
  }

  private decodeTokenAllowingGrace(currentToken: string): TokenUser {
    try {
      return jwt.verify(currentToken, process.env.JWT_SECRET!) as TokenUser;
    } catch (err: any) {
      if (err?.name !== "TokenExpiredError") {
        throw new Error("Token inválido.");
      }

      const decoded = jwt.verify(currentToken, process.env.JWT_SECRET!, {
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

    return this.register({
      name: data.name,
      email: data.email,
      password: data.password,
      role: Role.NUTRICIONISTA,
      status: UserStatus.PENDENTE,
    });
  }

  async register(data: any): Promise<any> {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error("Usuário já cadastrado.");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await userRepository.create({
      ...data,
      password: hashedPassword,
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(email: string, passwordText: string): Promise<any> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error("Credenciais inválidas.");
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

    const token = this.issueToken(user);
    const { password, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  async findById(id: string): Promise<any> {
    return userRepository.findById(id);
  }

  async changePasswordOnFirstAccess(userId: string, newPassword: string): Promise<any> {
    if (!newPassword || newPassword.length < 6) {
      throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
    }

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
}
