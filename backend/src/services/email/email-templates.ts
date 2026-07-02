import { getEmailLogoUrl } from "../../utils/email-config";

type LayoutOptions = {
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

function highlightBox(contentHtml: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;background:#f4f7f5;border:1px solid #e2e8e4;border-radius:18px;">
      <tr>
        <td style="padding:18px 20px;">
          ${contentHtml}
        </td>
      </tr>
    </table>
  `;
}

function emailLogoBlock(logoUrl: string): string {
  return `
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 22px;">
                  <tr>
                    <td align="center" style="line-height:0;font-size:0;">
                      <img
                        src="${logoUrl}"
                        alt="Clube Florescer"
                        width="59"
                        height="83"
                        style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;height:83px;width:59px;max-width:59px;"
                      />
                    </td>
                  </tr>
                </table>`;
}

function layout({ title, bodyHtml, ctaLabel, ctaUrl }: LayoutOptions): string {
  const logoUrl = getEmailLogoUrl();
  const logoBlock = emailLogoBlock(logoUrl);
  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<p style="margin:28px 0 0;text-align:center;">
          <a href="${ctaUrl}" style="display:inline-block;background:#8B967C;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:16px;">
            ${ctaLabel}
          </a>
        </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f4f7f5;font-family:Inter,Arial,sans-serif;color:#1a2e24;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8e4;border-radius:24px;padding:32px 28px;">
            <tr>
              <td align="center">
                ${logoBlock}
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#1a2e24;text-align:center;">${title}</h1>
                <div style="font-size:15px;line-height:1.6;color:#5c6b64;text-align:left;">${bodyHtml}</div>
                ${ctaBlock}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function registrationRequestPatientEmail(name: string) {
  const firstName = name.split(" ")[0] || name;
  return {
    subject: "Recebemos sua solicitação de cadastro",
    html: layout({
      title: "Solicitação enviada",
      bodyHtml: `
        <p>Olá, ${firstName}.</p>
        <p>Recebemos sua solicitação para entrar no Clube Florescer. A nutricionista vai analisar seus dados e liberar seu acesso em breve.</p>
        <p>Quando sua conta for aprovada, você receberá um novo e-mail e poderá entrar no app com o e-mail e a senha que você cadastrou.</p>
      `,
    }),
  };
}

export function registrationRequestNutriEmail(input: {
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  adminUrl: string;
}) {
  const details = [
    `<p><strong>Nome:</strong> ${input.name}</p>`,
    `<p><strong>E-mail:</strong> ${input.email}</p>`,
    input.phone ? `<p><strong>Telefone:</strong> ${input.phone}</p>` : "",
    input.message ? `<p><strong>Mensagem:</strong> ${input.message}</p>` : "",
  ]
    .filter(Boolean)
    .join("");

  return {
    subject: `Nova aluna cadastrada: ${input.name}`,
    html: layout({
      title: "Nova aluna no app",
      bodyHtml: `
        <p>Uma nova aluna criou conta no app do paciente.</p>
        ${details}
        <p>Ela será direcionada ao checkout para concluir o pagamento.</p>
      `,
      ctaLabel: "Abrir painel",
      ctaUrl: `${input.adminUrl}/usuarios`,
    }),
  };
}

export function newPatientSignupNutriEmail(input: {
  name: string;
  email: string;
  phone?: string | null;
  adminUrl: string;
}) {
  return registrationRequestNutriEmail({ ...input, message: null });
}

export function registrationApprovedEmail(input: {
  name: string;
  accessExpiresLabel?: string | null;
  appUrl: string;
}) {
  const firstName = input.name.split(" ")[0] || input.name;
  const accessLine = input.accessExpiresLabel
    ? `<p style="margin:0 0 12px;">Seu acesso está liberado até <strong>${input.accessExpiresLabel}</strong>.</p>`
    : `<p style="margin:0 0 12px;">Seu acesso ao Clube Florescer está liberado.</p>`;

  const stepsBox = highlightBox(`
    <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#8B967C;">
      Como entrar
    </p>
    <p style="margin:0 0 8px;"><strong>1.</strong> Se você instalou o app, abra pelo ícone <strong>Clube Florescer</strong> na tela inicial.</p>
    <p style="margin:0 0 8px;"><strong>2.</strong> Ou toque no botão abaixo e entre com o e-mail e a senha que você cadastrou.</p>
    <p style="margin:0;"><strong>3.</strong> Explore seus conteúdos, diário, check-ins e a Bella.</p>
  `);

  return {
    subject: "Boas-vindas ao Clube Florescer, seu acesso foi liberado",
    html: layout({
      title: "Você foi aprovada!",
      bodyHtml: `
        <p style="margin:0 0 14px;">Olá, ${firstName}.</p>
        <p style="margin:0 0 14px;">
          Sua solicitação foi aprovada pela nutricionista. A partir de agora você faz parte do
          <strong>Clube Florescer</strong> e já pode acessar o app.
        </p>
        ${accessLine}
        ${stepsBox}
        <p style="margin:0;font-size:14px;color:#5c6b64;">
          Se tiver qualquer dúvida, responda este e-mail ou fale com a nutricionista.
        </p>
      `,
      ctaLabel: "Acessar o Clube Florescer",
      ctaUrl: input.appUrl,
    }),
  };
}

export function registrationRejectedEmail(name: string) {
  const firstName = name.split(" ")[0] || name;

  return {
    subject: "Atualização sobre sua solicitação de cadastro",
    html: layout({
      title: "Solicitação não aprovada",
      bodyHtml: `
        <p>Olá, ${firstName}.</p>
        <p>Sua solicitação de acesso ao Clube Florescer não foi aprovada neste momento.</p>
        <p>Se acredita que houve algum engano, entre em contato com a nutricionista.</p>
      `,
    }),
  };
}

export function passwordResetEmail(input: { name: string; resetUrl: string; expiresInMinutes: number }) {
  const firstName = input.name.split(" ")[0] || input.name;

  return {
    subject: "Redefinir sua senha no Clube Florescer",
    html: layout({
      title: "Redefinir senha",
      bodyHtml: `
        <p>Olá, ${firstName}.</p>
        <p>Recebemos um pedido para redefinir a senha da sua conta. O link abaixo expira em ${input.expiresInMinutes} minutos.</p>
        <p>Se você não solicitou isso, ignore este e-mail. Sua senha permanece a mesma.</p>
      `,
      ctaLabel: "Redefinir senha",
      ctaUrl: input.resetUrl,
    }),
  };
}

export function billingPaymentSuccessEmail(input: {
  name: string;
  accessExpiresLabel?: string | null;
  appUrl: string;
}) {
  const firstName = input.name.split(" ")[0] || input.name;
  const accessLine = input.accessExpiresLabel
    ? `<p>Seu acesso está liberado até <strong>${input.accessExpiresLabel}</strong>.</p>`
    : "<p>Seu acesso ao Clube Florescer está liberado.</p>";

  return {
    subject: "Pagamento confirmado — bem-vinda ao Clube Florescer!",
    html: layout({
      title: "Pagamento confirmado",
      bodyHtml: `
        <p>Olá, ${firstName}!</p>
        <p>Recebemos seu pagamento com sucesso.</p>
        ${accessLine}
        <p>Você já pode usar o app com dieta, Bella IA e check-ins.</p>
      `,
      ctaLabel: "Entrar no app",
      ctaUrl: input.appUrl,
    }),
  };
}

export function billingPaymentFailedEmail(input: {
  name: string;
  checkoutUrl: string;
  reason?: string;
}) {
  const firstName = input.name.split(" ")[0] || input.name;

  return {
    subject: "Não foi possível confirmar seu pagamento",
    html: layout({
      title: "Pagamento não confirmado",
      bodyHtml: `
        <p>Olá, ${firstName}.</p>
        <p>Não conseguimos confirmar seu pagamento no Clube Florescer.</p>
        <p>Você pode tentar novamente com outro cartão ou usar Pix.</p>
      `,
      ctaLabel: "Tentar novamente",
      ctaUrl: input.checkoutUrl,
    }),
  };
}

export function billingCartReminderEmail(input: {
  name: string;
  checkoutUrl: string;
  reminderKind: "5m" | "15m";
}) {
  const firstName = input.name.split(" ")[0] || input.name;
  const intro = input.reminderKind === "15m"
    ? "Ainda dá tempo de concluir sua assinatura no Clube Florescer."
    : "Você começou sua assinatura e ainda não finalizou o pagamento.";

  return {
    subject: input.reminderKind === "15m"
      ? "Último lembrete — finalize sua assinatura"
      : "Finalize sua assinatura no Clube Florescer",
    html: layout({
      title: "Sua assinatura está quase pronta",
      bodyHtml: `
        <p>Olá, ${firstName}.</p>
        <p>${intro}</p>
        <p>Quando estiver pronta, é só concluir o pagamento no link abaixo.</p>
      `,
      ctaLabel: "Concluir assinatura",
      ctaUrl: input.checkoutUrl,
    }),
  };
}

export function billingRenewalReminderEmail(input: {
  name: string;
  accessExpiresLabel?: string | null;
  checkoutUrl: string;
}) {
  const firstName = input.name.split(" ")[0] || input.name;
  const dateLabel = input.accessExpiresLabel || "em breve";

  return {
    subject: "Sua assinatura vence em 3 dias",
    html: layout({
      title: "Renove sua assinatura",
      bodyHtml: `
        <p>Olá, ${firstName}.</p>
        <p>Sua assinatura do Clube Florescer vence em <strong>${dateLabel}</strong>.</p>
        <p>Renove para continuar com acesso sem interrupção.</p>
      `,
      ctaLabel: "Renovar assinatura",
      ctaUrl: input.checkoutUrl,
    }),
  };
}

export function registrationWelcomeCheckoutEmail(input: { name: string; checkoutUrl: string }) {
  const firstName = input.name.split(" ")[0] || input.name;

  return {
    subject: "Bem-vinda ao Clube Florescer — finalize sua assinatura",
    html: layout({
      title: "Conta criada com sucesso",
      bodyHtml: `
        <p>Olá, ${firstName}!</p>
        <p>Sua conta foi criada. Falta só um passo: concluir o pagamento para liberar o acesso ao app.</p>
      `,
      ctaLabel: "Ir para o checkout",
      ctaUrl: input.checkoutUrl,
    }),
  };
}
