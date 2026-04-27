import { Response } from "express";

type ParsedUazapiError = {
  statusCode: number;
  code: string;
  message: string;
  details?: any;
};

const tryExtractStatusCode = (message: string): number | null => {
  const match = message.match(/\b(4\d{2}|5\d{2})\b/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

export const normalizeUazapiError = (error: unknown, fallbackMessage: string): ParsedUazapiError => {
  const rawMessage = error instanceof Error ? error.message : String(error || "");
  const normalized = String(rawMessage || "").trim();
  const lowered = normalized.toLowerCase();
  const inferredStatus =
    tryExtractStatusCode(normalized) ||
    (lowered.includes("não autorizado") || lowered.includes("nao autorizado") || lowered.includes("token inválido") || lowered.includes("token invalido") ? 401 : null) ||
    (lowered.includes("permiss") || lowered.includes("forbidden") || lowered.includes("admin") ? 403 : null) ||
    (lowered.includes("não encontrado") || lowered.includes("nao encontrado") ? 404 : null) ||
    (lowered.includes("requisição inválida") || lowered.includes("requisicao invalida") || lowered.includes("payload") ? 400 : null) ||
    (lowered.includes("rate limit") ? 429 : null) ||
    (lowered.includes("arquivo muito grande") ? 413 : null) ||
    (lowered.includes("formato de mídia") || lowered.includes("formato de midia") ? 415 : null) ||
    500;

  const codeByStatus: Record<number, string> = {
    400: "UAZAPI_BAD_REQUEST",
    401: "UAZAPI_UNAUTHORIZED",
    403: "UAZAPI_FORBIDDEN",
    404: "UAZAPI_NOT_FOUND",
    413: "UAZAPI_PAYLOAD_TOO_LARGE",
    415: "UAZAPI_UNSUPPORTED_MEDIA_TYPE",
    429: "UAZAPI_RATE_LIMIT",
    500: "UAZAPI_INTERNAL_ERROR"
  };

  return {
    statusCode: inferredStatus,
    code: codeByStatus[inferredStatus] || "UAZAPI_ERROR",
    message: normalized || fallbackMessage,
    details: error
  };
};

export const sendNormalizedUazapiError = (res: Response, error: unknown, fallbackMessage: string) => {
  const parsed = normalizeUazapiError(error, fallbackMessage);
  return res.status(parsed.statusCode).json({
    message: parsed.message,
    error: parsed.code,
    statusCode: parsed.statusCode
  });
};
