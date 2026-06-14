import { readEnv } from "./env";

let cachedSecret: string | null = null;

export function getJwtSecret(): string {
  if (cachedSecret) return cachedSecret;

  const secret = readEnv("JWT_SECRET");
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET ausente ou muito curto (mínimo 16 caracteres).");
  }

  cachedSecret = secret;
  return secret;
}

export function assertJwtSecretOnBoot(): void {
  getJwtSecret();
}
