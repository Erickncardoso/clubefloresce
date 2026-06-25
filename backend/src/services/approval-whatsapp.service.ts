import { getPatientAppOpenUrl, getWhatsappLinkPreviewImageUrl } from "../utils/email-config";
import { normalizePhoneForWhatsapp } from "../utils/phone";
import {
  finalizeApprovalWhatsappLayout,
  isLegacyApprovalTemplate,
  normalizeWhatsappOutgoingText,
  upgradeApprovalTemplate,
  WHATSAPP_FORMAT_HINT,
} from "../utils/whatsapp-message-format";
import { AppSettingRepository } from "../repositories/app-setting.repository";
import { WhatsappService } from "./whatsapp.service";

export const APPROVAL_WHATSAPP_TEMPLATE_KEY = "approval_whatsapp_message";

export const DEFAULT_APPROVAL_WHATSAPP_TEMPLATE = `Olá, *{{primeiroNome}}*!

Sua solicitação foi aprovada pela nutricionista. A partir de agora você faz parte do *Clube Florescer* e já pode acessar o app.

{{acessoAte}}

*Como entrar:*
• Abra o ícone *Clube Florescer* na tela inicial (se já instalou)
• Toque no link abaixo 👇
{{linkApp}}
• Entre com o e-mail e a senha que você cadastrou

_Se tiver dúvidas, responda esta mensagem._`;

function formatAccessExpiresLabel(value?: Date | null): string {
  if (!value) {
    return "Seu acesso ao *Clube Florescer* está liberado.";
  }

  const label = value.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return `Seu acesso está liberado até *${label}*.`;
}

export function resolveApprovalWhatsappTemplate(stored?: string | null): string {
  const trimmed = stored?.trim();
  if (!trimmed || isLegacyApprovalTemplate(trimmed)) {
    return DEFAULT_APPROVAL_WHATSAPP_TEMPLATE;
  }
  return upgradeApprovalTemplate(trimmed);
}

export function renderApprovalWhatsappMessage(
  template: string,
  input: {
    name: string;
    accessExpiresAt?: Date | null;
    appUrl?: string;
  },
): string {
  const firstName = input.name.split(" ")[0] || input.name;
  const appUrl = input.appUrl || getPatientAppOpenUrl("approval-whatsapp");
  const resolvedTemplate = resolveApprovalWhatsappTemplate(template);

  return finalizeApprovalWhatsappLayout(
    resolvedTemplate
      .split("{{nome}}").join(input.name)
      .split("{{primeiroNome}}").join(firstName)
      .split("{{linkApp}}").join(appUrl)
      .split("{{acessoAte}}").join(formatAccessExpiresLabel(input.accessExpiresAt)),
  );
}

export class ApprovalWhatsappService {
  private readonly appSettingRepo = new AppSettingRepository();
  private readonly whatsappService = new WhatsappService();

  async getTemplate(): Promise<string> {
    const stored = await this.appSettingRepo.get(APPROVAL_WHATSAPP_TEMPLATE_KEY);
    const resolved = resolveApprovalWhatsappTemplate(stored);

    if (stored?.trim() && resolved !== stored.trim()) {
      await this.appSettingRepo.set(APPROVAL_WHATSAPP_TEMPLATE_KEY, resolved);
    }

    return resolved;
  }

  async updateTemplate(message: string): Promise<string> {
    const trimmed = normalizeWhatsappOutgoingText(message);
    if (!trimmed) {
      throw new Error("Informe o texto da mensagem.");
    }
    if (trimmed.length > 4000) {
      throw new Error("A mensagem deve ter no máximo 4000 caracteres.");
    }
    return this.appSettingRepo.set(APPROVAL_WHATSAPP_TEMPLATE_KEY, upgradeApprovalTemplate(trimmed));
  }

  async sendApprovalMessage(input: {
    nutriUserId: string;
    phone: string | null | undefined;
    name: string;
    accessExpiresAt?: Date | null;
    messageOverride?: string | null;
  }): Promise<void> {
    const number = normalizePhoneForWhatsapp(input.phone);
    if (!number) {
      throw new Error("Telefone inválido ou ausente.");
    }

    const templateSource = input.messageOverride?.trim() || (await this.getTemplate());
    const text = renderApprovalWhatsappMessage(templateSource, {
      name: input.name,
      accessExpiresAt: input.accessExpiresAt,
    });

    await this.whatsappService.sendText(input.nutriUserId, {
      number,
      text,
      linkPreview: true,
      linkPreviewTitle: "Clube Florescer",
      linkPreviewDescription: "Toque para abrir o app e entrar com seu e-mail e senha.",
      linkPreviewImage: getWhatsappLinkPreviewImageUrl(),
      linkPreviewLarge: true,
      delay: 900,
    });
  }
}

export const approvalWhatsappService = new ApprovalWhatsappService();

export function dispatchApprovalWhatsapp(task: Promise<void>, context: string) {
  void task.catch((error: any) => {
    console.error(`[WhatsApp aprovação] ${context}:`, error?.message || error);
  });
}

export { WHATSAPP_FORMAT_HINT };
