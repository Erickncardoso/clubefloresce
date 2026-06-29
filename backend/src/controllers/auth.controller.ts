import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { RegistrationRequestService } from "../services/registration-request.service";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../utils/jwt";
import { UserStatus } from "@prisma/client";
import { isPatientAccessExpired } from "../utils/access-expires";
import { mapDatabaseError } from "../utils/db-errors";
import {
  clearAuthCookie,
  extractAuthToken,
  setAuthCookie,
  stripTokenFromAuthPayload,
} from "../utils/auth-cookie";

const authService = new AuthService();
const registrationRequestService = new RegistrationRequestService();

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

  async requestPatientRegistration(req: Request, res: Response): Promise<any> {
    try {
      const request = await registrationRequestService.createPatientRequest(req.body);
      return res.status(201).json({
        message: "Solicitação enviada com sucesso.",
        request,
      });
    } catch (error: any) {
      console.error("[auth] requestPatientRegistration:", error?.message || error);
      const message = String(error?.message || "");

      if (message.includes("connection pool") || error?.code === "P2024") {
        return res.status(503).json({
          message: "Servidor ocupado. Aguarde alguns segundos e tente novamente.",
        });
      }

      if (message.includes("Faça login")) {
        return res.status(409).json({ message });
      }

      if (message && !message.includes("prisma") && !message.includes("Invalid `")) {
        return res.status(400).json({ message });
      }

      return res.status(400).json({ message: "Não foi possível enviar sua solicitação. Tente novamente." });
    }
  }

  private authFailureStatus(message: string): number {
    if (
      message.includes("expirou")
      || message.includes("desativada")
      || message.includes("em análise")
      || message.includes("em analise")
    ) {
      return 403;
    }
    return 401;
  }

  async login(req: Request, res: Response): Promise<any> {
    try {
      const { email, password } = req.body;
      const data = await authService.login(email, password);
      setAuthCookie(res, data.token, data.user?.role);
      return res.json(stripTokenFromAuthPayload(data));
    } catch (error: any) {
      const mapped = mapDatabaseError(error);
      if (mapped) {
        return res.status(503).json({ message: mapped });
      }

      const message = error.message || "Credenciais inválidas.";
      return res.status(this.authFailureStatus(message)).json({ message });
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

  async refresh(req: Request, res: Response): Promise<any> {
    try {
      const token = extractAuthToken(req);
      if (!token) return res.status(401).json({ message: "Não autorizado" });

      const data = await authService.refreshSession(token);
      setAuthCookie(res, data.token, data.user?.role);
      return res.json(stripTokenFromAuthPayload(data));
    } catch (error: any) {
      const message = error.message || "Sessão expirada.";
      return res.status(this.authFailureStatus(message)).json({ message });
    }
  }

  async me(req: Request, res: Response): Promise<any> {
    try {
      const token = extractAuthToken(req);
      if (!token) return res.status(401).json({ message: "Não autorizado" });
      
      const payload: any = jwt.verify(token, getJwtSecret());
      const user = await authService.findById(payload.id);

      if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
      if (user.status === UserStatus.INATIVO) {
        return res.status(403).json({ message: "Conta desativada." });
      }

      if (isPatientAccessExpired(user.accessExpiresAt)) {
        return res.status(403).json({ message: "Seu acesso ao Clube Florescer expirou. Entre em contato com a nutricionista." });
      }
      
      const { password, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (error: any) {
      return res.status(401).json({ message: "Acesso expirado" });
    }
  }

  async logout(_req: Request, res: Response): Promise<any> {
    clearAuthCookie(res);
    return res.json({ ok: true });
  }

  async updateAvatar(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Usuário não autenticado." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Nenhuma imagem enviada." });
      }

      const user = await authService.updateAvatar(req.user.id, {
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      return res.json(user);
    } catch (error: any) {
      const message = error?.message || "Não foi possível atualizar a foto.";
      const status = message.includes("Cloudinary") ? 503 : 400;
      return res.status(status).json({ message });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<any> {
    try {
      const email = req.body?.email;
      const app = req.body?.app === "admin" ? "admin" : "patient";

      await authService.requestPasswordReset(email, app);

      return res.json({
        message:
          "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes.",
      });
    } catch (error: any) {
      const message = error?.message || "Não foi possível processar sua solicitação.";
      return res.status(400).json({ message });
    }
  }

  async validatePasswordReset(req: Request, res: Response): Promise<any> {
    try {
      const token = typeof req.query.token === "string" ? req.query.token : "";
      await authService.validatePasswordResetToken(token);
      return res.json({ valid: true });
    } catch (error: any) {
      return res.status(400).json({
        valid: false,
        message: error?.message || "Link inválido ou expirado.",
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<any> {
    try {
      const { token, newPassword } = req.body || {};
      await authService.resetPasswordWithToken(token, newPassword);
      return res.json({ message: "Senha redefinida com sucesso. Você já pode entrar." });
    } catch (error: any) {
      const message = error?.message || "Não foi possível redefinir a senha.";
      return res.status(400).json({ message });
    }
  }
}
