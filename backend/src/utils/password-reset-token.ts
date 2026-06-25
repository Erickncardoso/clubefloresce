import crypto from "crypto";

export function createPasswordResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const DEFAULT_PASSWORD_RESET_TTL_MINUTES = 10;

export function getPasswordResetTtlMinutes(): number {
  const minutes = Number(
    process.env.PASSWORD_RESET_TTL_MINUTES || String(DEFAULT_PASSWORD_RESET_TTL_MINUTES),
  );
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return DEFAULT_PASSWORD_RESET_TTL_MINUTES;
  }
  return minutes;
}

export function getPasswordResetTtlMs(): number {
  return getPasswordResetTtlMinutes() * 60 * 1000;
}
