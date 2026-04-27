import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import jwt from "jsonwebtoken";

const authService = new AuthService();

export class AuthController {
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
