import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getPatientCheckoutOpenUrl, getWhatsappLinkPreviewImageUrl } from "../utils/email-config";
import { normalizePhoneForWhatsapp } from "../utils/phone";
import { WhatsappService } from "./whatsapp.service";

function firstName(name: string): string {
  return name.split(" ")[0] || name;
}

function buildRegistrationCheckoutMessage(name: string, checkoutUrl: string): string {
  const first = firstName(name);
  return [
    `Olá, *${first}*! 🌿`,
    "",
    "Sua conta no *Clube Florescer* foi criada com sucesso.",
    "",
    "Para liberar seu acesso, finalize o pagamento pelo link abaixo:",
    checkoutUrl,
    "",
    "Depois é só entrar no app com o e-mail e a senha que você cadastrou.",
    "",
    "_Se tiver dúvidas, responda esta mensagem._",
  ].join("\n");
}

async function getPrimaryNutritionistId(): Promise<string | null> {
  const nutri = await prisma.user.findFirst({
    where: { role: Role.NUTRICIONISTA, status: { in: [UserStatus.ATIVO, UserStatus.PENDENTE] } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return nutri?.id || null;
}

export class RegistrationCheckoutWhatsappService {
  private readonly whatsappService = new WhatsappService();

  async sendCheckoutLink(input: {
    name: string;
    phone: string;
  }): Promise<void> {
    const number = normalizePhoneForWhatsapp(input.phone);
    if (!number) {
      throw new Error("Telefone inválido ou ausente.");
    }

    const nutriUserId = await getPrimaryNutritionistId();
    if (!nutriUserId) {
      throw new Error("WhatsApp da nutricionista não configurado.");
    }

    const checkoutUrl = getPatientCheckoutOpenUrl("registration-whatsapp");
    const text = buildRegistrationCheckoutMessage(input.name, checkoutUrl);

    await this.whatsappService.sendText(nutriUserId, {
      number,
      text,
      linkPreview: true,
      linkPreviewTitle: "Clube Florescer — assinatura",
      linkPreviewDescription: "Toque para finalizar seu pagamento e liberar o acesso.",
      linkPreviewImage: getWhatsappLinkPreviewImageUrl(),
      linkPreviewLarge: true,
      delay: 900,
    });
  }
}

export const registrationCheckoutWhatsappService = new RegistrationCheckoutWhatsappService();

export function dispatchRegistrationCheckoutWhatsapp(task: Promise<void>) {
  void task.catch((error: any) => {
    console.error("[WhatsApp cadastro checkout]:", error?.message || error);
  });
}
