import { Resend } from "resend";
import {
  type EmailSender,
  getAdminAppUrl,
  getPatientAppUrl,
  getPatientAppOpenUrl,
  isResendConfigured,
  resolveEmailFrom,
  resolveNutriNotificationEmail,
} from "../../utils/email-config";
import { getPasswordResetTtlMinutes } from "../../utils/password-reset-token";
import {
  passwordResetEmail,
  registrationApprovedEmail,
  registrationRejectedEmail,
  registrationRequestNutriEmail,
  registrationRequestPatientEmail,
} from "./email-templates";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  from?: EmailSender;
};

let resendClient: Resend | null = null;

function getClient(): Resend | null {
  if (!isResendConfigured()) return null;
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function formatAccessExpiresLabel(value?: Date | null): string | null {
  if (!value) return null;
  return value.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function dispatchEmail(task: Promise<void>, context: string) {
  void task.catch((error: any) => {
    console.error(`[Email] ${context}:`, error?.message || error);
  });
}

export class EmailService {
  async send(input: SendEmailInput): Promise<void> {
    const client = getClient();
    if (!client) {
      console.warn("[Email] RESEND_API_KEY ausente — envio ignorado.");
      return;
    }

    const recipients = Array.isArray(input.to) ? input.to : [input.to];
    const from = resolveEmailFrom(input.from ?? "contact");
    const { error } = await client.emails.send({
      from,
      to: recipients,
      subject: input.subject,
      html: input.html,
    });

    if (error) {
      throw new Error(error.message || "Falha ao enviar e-mail.");
    }
  }

  async sendRegistrationRequestCreated(input: {
    name: string;
    email: string;
    phone?: string | null;
    message?: string | null;
  }) {
    const patientTemplate = registrationRequestPatientEmail(input.name);
    await this.send({
      to: input.email,
      subject: patientTemplate.subject,
      html: patientTemplate.html,
      from: "contact",
    });

    const nutriEmail = await resolveNutriNotificationEmail();
    const nutriTemplate = registrationRequestNutriEmail({
      ...input,
      adminUrl: getAdminAppUrl(),
    });

    await this.send({
      to: nutriEmail,
      subject: nutriTemplate.subject,
      html: nutriTemplate.html,
      from: "contact",
    });
  }

  async sendRegistrationApproved(input: {
    name: string;
    email: string;
    accessExpiresAt?: Date | null;
  }) {
    const template = registrationApprovedEmail({
      name: input.name,
      accessExpiresLabel: formatAccessExpiresLabel(input.accessExpiresAt),
      appUrl: getPatientAppOpenUrl("approval-email"),
    });

    await this.send({
      to: input.email,
      subject: template.subject,
      html: template.html,
      from: "contact",
    });
  }

  async sendRegistrationRejected(input: { name: string; email: string }) {
    const template = registrationRejectedEmail(input.name);

    await this.send({
      to: input.email,
      subject: template.subject,
      html: template.html,
      from: "contact",
    });
  }

  /** Recuperação de senha — remetente noreply@ (sem resposta). */
  async sendPasswordReset(input: { name: string; email: string; resetUrl: string }) {
    const template = passwordResetEmail({
      name: input.name,
      resetUrl: input.resetUrl,
      expiresInMinutes: getPasswordResetTtlMinutes(),
    });

    await this.send({
      to: input.email,
      subject: template.subject,
      html: template.html,
      from: "noreply",
    });
  }
}

export const emailService = new EmailService();
