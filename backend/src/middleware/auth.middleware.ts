import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient, Role, UserStatus } from "@prisma/client";
import { getJwtSecret } from "../utils/jwt";

const prisma = new PrismaClient();

const PENDING_NUTRI_ALLOWED_PREFIXES = [
  "/api/auth/me",
  "/api/auth/refresh",
  "/api/auth/first-access",
];

function isPendingNutriAllowedPath(path: string): boolean {
  return PENDING_NUTRI_ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Usuário não autenticado." });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      return res.status(401).json({ message: "Sessão expirada ou usuário inválido. Faça login novamente." });
    }

    if (user.status === UserStatus.INATIVO) {
      return res.status(403).json({ message: "Conta desativada. Entre em contato com o suporte." });
    }

    if (
      user.role === Role.NUTRICIONISTA &&
      user.status === UserStatus.PENDENTE &&
      !isPendingNutriAllowedPath(req.path)
    ) {
      return res.status(403).json({ message: "Altere sua senha de primeiro acesso para continuar." });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido." });
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Acesso negado." });
    }
    next();
  };
};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        status?: string;
      };
    }
  }
}
