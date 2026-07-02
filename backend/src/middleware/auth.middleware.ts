import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getJwtSecret } from "../utils/jwt";
import { isPatientAccessExpired } from "../utils/access-expires";
import {
  isPatientAppAccessBlocked,
  patientHadGrantedAccess,
  PATIENT_ACCESS_EXPIRED_RENEW_MESSAGE,
  PATIENT_PAYMENT_REQUIRED_MESSAGE,
} from "../utils/patient-paid-access";
import { extractAuthToken } from "../utils/auth-cookie";
import { mapDatabaseError } from "../utils/db-errors";

const PENDING_NUTRI_ALLOWED_PREFIXES = [
  "/api/auth/me",
  "/api/auth/refresh",
  "/api/auth/first-access",
];

/** Paciente com acesso expirado ainda pode renovar via billing. */
function isExpiredPatientAllowedPath(req: Request): boolean {
  const path = `${req.baseUrl}${req.path}`;
  return path.startsWith("/api/billing");
}

const AUTH_USER_CACHE_TTL_MS = 30_000;
const authUserCache = new Map<
  string,
  {
    user: Express.Request["user"];
    expiresAt: number;
  }
>();

function isPendingNutriAllowedPath(path: string): boolean {
  return PENDING_NUTRI_ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const token = extractAuthToken(req);

  if (!token) {
    return res.status(401).json({ message: "Usuário não autenticado." });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string };

    const cached = authUserCache.get(decoded.id);
    if (cached && cached.expiresAt > Date.now() && cached.user) {
      req.user = cached.user;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        accessExpiresAt: true,
        plan: true,
        approvalEmailSentAt: true,
      },
    });

    if (!user) {
      authUserCache.delete(decoded.id);
      return res.status(401).json({ message: "Sessão expirada ou usuário inválido. Faça login novamente." });
    }

    if (user.status === UserStatus.INATIVO) {
      return res.status(403).json({ message: "Conta desativada. Entre em contato com o suporte." });
    }

    if (
      user.role === Role.PACIENTE
      && isPatientAppAccessBlocked(user.plan, user.accessExpiresAt, user.approvalEmailSentAt)
    ) {
      if (!isExpiredPatientAllowedPath(req)) {
        const hadAccess = patientHadGrantedAccess({
          plan: user.plan,
          accessExpiresAt: user.accessExpiresAt,
          approvalEmailSentAt: user.approvalEmailSentAt,
        });
        const expired = hadAccess && isPatientAccessExpired(user.accessExpiresAt);
        const message = expired
          ? PATIENT_ACCESS_EXPIRED_RENEW_MESSAGE
          : PATIENT_PAYMENT_REQUIRED_MESSAGE;
        return res.status(403).json({
          message,
          code: "PATIENT_ACCESS_BLOCKED",
          reason: expired ? "expired" : "payment_required",
        });
      }
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
    authUserCache.set(decoded.id, {
      user: req.user,
      expiresAt: Date.now() + AUTH_USER_CACHE_TTL_MS,
    });
    next();
  } catch (error) {
    const dbMessage = mapDatabaseError(error);
    if (dbMessage) {
      return res.status(503).json({ message: dbMessage });
    }
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
