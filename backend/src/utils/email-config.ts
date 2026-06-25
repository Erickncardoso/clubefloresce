import { Role, UserStatus } from "@prisma/client";
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

export function getPatientAppUrl(): string {
  const configured = readEnv("PATIENT_APP_URL");
  if (configured) return configured.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    return "https://app.nutrisabellajardim.com.br";
  }

  return "http://127.0.0.1:3002";
}

/** Link de e-mail que abre a rota /abrir (PWA no Android quando instalado; guia no iOS). */
export function getPatientAppOpenUrl(source = "email"): string {
  const params = new URLSearchParams({ source });
  return `${getPatientAppUrl()}/abrir?${params.toString()}`;
}

export function getAdminAppUrl(): string {
  const configured = readEnv("ADMIN_APP_URL");
  if (configured) return configured.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    return "https://clube.nutrisabellajardim.com.br";
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
  const base = app === "admin" ? getAdminAppUrl() : getPatientAppUrl();
  return `${base}/redefinir-senha?token=${encodeURIComponent(token)}`;
}

/** Logo inline nos templates de e-mail (URL absoluta HTTPS). */
export function getEmailLogoUrl(): string {
  const configured = readEnv("EMAIL_LOGO_URL");
  if (configured) return configured;
  return `${getPatientAppUrl()}/icons/logovetorcarregamento.svg`;
}

/** Miniatura PNG para preview de link no WhatsApp (UAZAPI exige JPG/PNG). */
export function getWhatsappLinkPreviewImageUrl(): string {
  const configured = readEnv("WHATSAPP_LINK_PREVIEW_IMAGE_URL");
  if (configured) return configured;
  return `${getPatientAppUrl()}/pwa/apple-touch-icon.png`;
}

/** Logo quadrada para BIMI/DMARC (separada do inline nos e-mails). */
export function getBimiLogoUrl(): string {
  const configured = readEnv("BIMI_LOGO_URL");
  if (configured) return configured;
  return `${getPatientAppUrl()}/bimi/clube-florescer.svg`;
}
