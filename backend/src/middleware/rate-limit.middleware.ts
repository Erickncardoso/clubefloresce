import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

const rateLimitMessage = {
  message: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
};

const isDevelopment = process.env.NODE_ENV !== "production";

function credentialKey(req: Request): string {
  const ip = ipKeyGenerator(req.ip || "");
  const email = typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  return email ? `${ip}:${email}` : ip;
}

/** Login, cadastro e setup — só falhas contam; chave por IP + e-mail. */
export const credentialRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => isDevelopment,
  keyGenerator: credentialKey,
  message: rateLimitMessage,
});

/** Compatibilidade com imports antigos. */
export const authRateLimiter = credentialRateLimiter;
