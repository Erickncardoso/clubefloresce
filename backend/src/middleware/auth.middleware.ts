import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Validar se o usuário realmente ainda existe no banco (Prevenção de Foreign Key Error)
    const userExists = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!userExists) {
      return res.status(401).json({ message: "Sessão expirada ou usuário inválido. Faça login novamente." });
    }

    req.user = decoded; // Adiciona o usuário logado ao objeto da requisição
    next();
  } catch (err) {
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
      };
    }
  }
}
