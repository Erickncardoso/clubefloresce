const DEFAULT_PRODUCTION_ORIGINS = [
  "https://clube.nutrisabellajardim.com.br",
  "https://www.clube.nutrisabellajardim.com.br",
  "https://app.nutrisabellajardim.com.br",
  "https://www.app.nutrisabellajardim.com.br",
  "https://nutrisabellajardim.com.br",
  "https://www.nutrisabellajardim.com.br",
];

export function getAllowedCorsOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (fromEnv?.length) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_ORIGINS;
  }

  return [
    ...DEFAULT_PRODUCTION_ORIGINS,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ];
}

export function isOriginAllowed(origin: string | undefined, allowed: string[]): boolean {
  if (!origin) return true;
  if (allowed.includes(origin)) return true;
  if (process.env.NODE_ENV !== "production") {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  }
  return false;
}
