import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/user.repository";
import { Role } from "@prisma/client";

const userRepository = new UserRepository();

export class AuthService {
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

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async findById(id: string): Promise<any> {
    return userRepository.findById(id);
  }
}
