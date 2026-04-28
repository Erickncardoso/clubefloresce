import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import jwt from "jsonwebtoken";

const authService = new AuthService();

export class AuthController {
  async oneTimeNutritionistStatus(req: Request, res: Response): Promise<any> {
    try {
      const status = await authService.getOneTimeNutritionistSetupStatus();
      return res.json(status);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async oneTimeNutritionistRegister(req: Request, res: Response): Promise<any> {
    try {
      const setupKey = req.headers["x-setup-key"] as string | undefined;
      const user = await authService.registerFirstNutritionist(req.body, setupKey);
      return res.status(201).json(user);
    } catch (error: any) {
      if (error.message === "Setup já utilizado. Já existe nutricionista cadastrado.") {
        return res.status(409).json({ message: error.message });
      }
      if (error.message === "Chave de setup inválida." || error.message === "Nome, e-mail e senha são obrigatórios.") {
        return res.status(400).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
  }

  async register(req: Request, res: Response): Promise<any> {
    try {
      const user = await authService.register(req.body);
      return res.status(201).json(user);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async login(req: Request, res: Response): Promise<any> {
    try {
      const { email, password } = req.body;
      const data = await authService.login(email, password);
      return res.json(data);
    } catch (error: any) {
      return res.status(401).json({ message: error.message });
    }
  }

  async changeFirstAccessPassword(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Usuário não autenticado." });
      }

      const { newPassword } = req.body;
      const user = await authService.changePasswordOnFirstAccess(req.user.id, newPassword);
      return res.json({ user, message: "Senha alterada com sucesso." });
    } catch (error: any) {
      if (error.message === "A nova senha deve ter pelo menos 6 caracteres.") {
        return res.status(400).json({ message: error.message });
      }
      if (error.message === "Troca de senha de primeiro acesso não é necessária.") {
        return res.status(409).json({ message: error.message });
      }
      if (error.message === "Usuário não encontrado.") {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
  }

  async me(req: Request, res: Response): Promise<any> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "Não autorizado" });
      
      const token = authHeader.split(" ")[1];
      const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
      const user = await authService.findById(payload.id);
      
      if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
      
      const { password, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (error: any) {
      return res.status(401).json({ message: "Acesso expirado" });
    }
  }
}
