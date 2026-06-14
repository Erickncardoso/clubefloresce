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
    return [...new Set([...fromEnv, ...DEFAULT_PRODUCTION_ORIGINS])];
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

export function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function isPrivateLanHostname(hostname: string): boolean {
  if (!hostname) return false;
  return /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
}

export function isDevBackendDirectHostname(hostname: string): boolean {
  return isLocalHostname(hostname) || isPrivateLanHostname(hostname);
}

const DEV_LAN_ORIGIN_PATTERN =
  /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export function isOriginAllowed(origin: string | undefined, allowed: string[]): boolean {
  if (!origin) return true;
  if (allowed.includes(origin)) return true;
  if (process.env.NODE_ENV !== "production") {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
    if (DEV_LAN_ORIGIN_PATTERN.test(origin)) return true;
  }
  return false;
}
