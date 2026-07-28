import { Role, UserStatus } from "@prisma/client";
import { networkInterfaces } from "node:os";
import { prisma } from "../lib/prisma";
import { readEnv } from "./env";

const DEFAULT_CONTACT_FROM = "Clube Florescer <contato@nutrisabellajardim.com.br>";
const DEFAULT_NOREPLY_FROM = "Clube Florescer <noreply@nutrisabellajardim.com.br>";
const DEFAULT_NUTRI_NOTIFICATION_EMAIL = "nutri.isabellajardim@gmail.com";

export type EmailSender = "contact" | "noreply";

export function isResendConfigured(): boolean {
  return Boolean(readEnv("RESEND_API_KEY"));
}

/** @deprecated Use getEmailFromContact() ou getEmailFromNoreply() */
export function getEmailFrom(): string {
  return getEmailFromContact();
}

/** E-mails operacionais (cadastro, alertas à nutri, aprovação/reprovação). */
export function getEmailFromContact(): string {
  return (
    readEnv("EMAIL_FROM_CONTACT") ||
    readEnv("EMAIL_FROM") ||
    DEFAULT_CONTACT_FROM
  );
}

/** E-mails automáticos sem resposta (recuperação de senha, etc.). */
export function getEmailFromNoreply(): string {
  return readEnv("EMAIL_FROM_NOREPLY") || DEFAULT_NOREPLY_FROM;
}

export function resolveEmailFrom(sender: EmailSender = "contact"): string {
  return sender === "noreply" ? getEmailFromNoreply() : getEmailFromContact();
}

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const DEFAULT_PATIENT_APP_PRODUCTION_URL = "https://app.nutrisabellajardim.com.br";
const DEFAULT_ADMIN_APP_PRODUCTION_URL = "https://clube.nutrisabellajardim.com.br";

function isLocalOrLanHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (LOCAL_HOSTNAMES.has(host)) return true;
  return host.startsWith("192.168.") || host.startsWith("10.");
}

/**
 * Normaliza a base URL usada em links de e-mail.
 * Remove barra final e — crucial — qualquer porta explícita (ex.: :3000) quando o host
 * é um domínio real. Porta só é mantida em hosts locais (localhost/127.0.0.1).
 */
export function normalizeAppUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.port && !LOCAL_HOSTNAMES.has(url.hostname.toLowerCase())) {
      url.port = "";
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    // Sem esquema (ex.: "dominio.com:3000/x") — remove ":porta" de host não-local via regex.
    return trimmed.replace(/^((?:https?:\/\/)?[^/:]+):\d+(?=$|\/)/i, (match, host) => {
      const bareHost = String(host).replace(/^https?:\/\//i, "").toLowerCase();
      return LOCAL_HOSTNAMES.has(bareHost) ? match : host;
    });
  }
}

function resolveConfiguredProductionUrl(
  explicitEnvKey: string,
  fallbackEnvKey: string,
  defaultUrl: string,
): string {
  const explicit = readEnv(explicitEnvKey);
  if (explicit) return normalizeAppUrl(explicit);

  const configured = readEnv(fallbackEnvKey);
  if (configured) {
    const normalized = normalizeAppUrl(configured);
    try {
      const host = new URL(normalized).hostname;
      if (!isLocalOrLanHost(host)) return normalized;
    } catch {
      /* ignore */
    }
  }

  return defaultUrl;
}

function getDevLanPatientAppUrl(): string | null {
  const lanOverride = readEnv("PATIENT_APP_LAN_URL");
  if (lanOverride) return normalizeAppUrl(lanOverride);

  try {
    for (const nets of Object.values(networkInterfaces())) {
      for (const net of nets || []) {
        if (net.family !== "IPv4" || net.internal) continue;
        if (
          net.address.startsWith("192.168.")
          || net.address.startsWith("10.")
        ) {
          return `http://${net.address}:3002`;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/** URL pública de produção — links em WhatsApp, e-mail, recuperação de senha, etc. */
export function getPatientAppProductionUrl(): string {
  return resolveConfiguredProductionUrl(
    "PATIENT_APP_PRODUCTION_URL",
    "PATIENT_APP_URL",
    DEFAULT_PATIENT_APP_PRODUCTION_URL,
  );
}

/** URL pública do painel admin — links em e-mails operacionais. */
export function getAdminAppProductionUrl(): string {
  return resolveConfiguredProductionUrl(
    "ADMIN_APP_PRODUCTION_URL",
    "ADMIN_APP_URL",
    DEFAULT_ADMIN_APP_PRODUCTION_URL,
  );
}

/** Base do app paciente em dev local (nunca use em mensagens externas). */
export function getPatientAppUrl(): string {
  const configured = readEnv("PATIENT_APP_URL");
  if (configured) {
    const normalized = normalizeAppUrl(configured);
    if (
      process.env.NODE_ENV !== "production"
      && !isLocalOrLanHost(new URL(normalized).hostname)
    ) {
      const lan = getDevLanPatientAppUrl();
      if (lan) return lan;
    }
    return normalized;
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PATIENT_APP_PRODUCTION_URL;
  }

  return getDevLanPatientAppUrl() || "http://127.0.0.1:3002";
}

function buildPublicOpenUrl(base: string, source: string, toPath = ""): string {
  const params = new URLSearchParams({ source });
  const path = String(toPath || "").trim();
  if (path) {
    params.set("to", path.startsWith("/") ? path : `/${path}`);
  }
  return `${base}/abrir?${params.toString()}`;
}

/** Link de checkout/assinatura — sempre produção (cadastro, WhatsApp, e-mail). */
export function getPatientCheckoutOpenUrl(source = "checkout"): string {
  return getPatientAppOpenUrl(source, "/assinatura");
}

/** Link /abrir em produção — WhatsApp, e-mail, billing, aprovação. */
export function getPatientAppOpenUrl(source = "email", toPath = ""): string {
  return buildPublicOpenUrl(getPatientAppProductionUrl(), source, toPath);
}

export function getAdminAppUrl(): string {
  const configured = readEnv("ADMIN_APP_URL");
  if (configured) return normalizeAppUrl(configured);

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_ADMIN_APP_PRODUCTION_URL;
  }

  return "http://127.0.0.1:3000";
}

export async function resolveNutriNotificationEmail(): Promise<string> {
  const configured = readEnv("NUTRI_NOTIFICATION_EMAIL");
  if (configured) return configured.toLowerCase();

  const nutri = await prisma.user.findFirst({
    where: {
      role: Role.NUTRICIONISTA,
      status: { in: [UserStatus.ATIVO, UserStatus.PENDENTE] },
    },
    select: { email: true },
    orderBy: { createdAt: "asc" },
  });

  return nutri?.email?.toLowerCase() || DEFAULT_NUTRI_NOTIFICATION_EMAIL;
}

export type PasswordResetApp = "admin" | "patient";

export function buildPasswordResetUrl(app: PasswordResetApp, token: string): string {
  const base = app === "admin" ? getAdminAppProductionUrl() : getPatientAppProductionUrl();
  return `${base}/redefinir-senha?token=${encodeURIComponent(token)}`;
}

/** Logo inline nos templates de e-mail (URL absoluta HTTPS). */
export function getEmailLogoUrl(): string {
  const configured = readEnv("EMAIL_LOGO_URL");
  if (configured) return configured;
  return `${getPatientAppProductionUrl()}/icons/logovetorcarregamento.svg`;
}

/** Miniatura PNG para preview de link no WhatsApp (UAZAPI exige JPG/PNG). */
export function getWhatsappLinkPreviewImageUrl(): string {
  const configured = readEnv("WHATSAPP_LINK_PREVIEW_IMAGE_URL");
  if (configured) return configured;
  return `${getPatientAppProductionUrl()}/pwa/apple-touch-icon.png`;
}

/** Logo quadrada para BIMI/DMARC (separada do inline nos e-mails). */
export function getBimiLogoUrl(): string {
  const configured = readEnv("BIMI_LOGO_URL");
  if (configured) return configured;
  return `${getPatientAppProductionUrl()}/bimi/clube-florescer.svg`;
}
