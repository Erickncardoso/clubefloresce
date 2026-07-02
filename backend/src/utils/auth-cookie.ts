import type { Response, Request } from "express";
import { Role } from "@prisma/client";

export const AUTH_COOKIE_NAME = "cf_session";

const STAFF_MAX_AGE_SEC = 30 * 24 * 60 * 60;
const PATIENT_MAX_AGE_SEC = 90 * 24 * 60 * 60;

function cookieMaxAgeSec(role?: Role | string | null): number {
  return role === Role.PACIENTE || role === "PACIENTE"
    ? PATIENT_MAX_AGE_SEC
    : STAFF_MAX_AGE_SEC;
}

function isSecureCookie(): boolean {
  if (process.env.AUTH_COOKIE_SECURE === "true") return true;
  if (process.env.AUTH_COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

export function extractAuthToken(req: Request): string | null {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookieToken === "string" && cookieToken.trim()) {
    return cookieToken.trim();
  }

  const header = req.headers.authorization?.split(" ")[1]?.trim();
  if (header) return header;

  return null;
}

export function setAuthCookie(
  res: Response,
  token: string,
  role?: Role | string | null,
): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAgeSec(role) * 1000,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    path: "/",
  });
}

export function stripTokenFromAuthPayload<T extends { token?: string }>(
  payload: T,
): Omit<T, "token"> {
  const { token: _removed, ...rest } = payload;
  return rest;
}
