const DEV_PATTERNS = [
  /mercado\s*pago/i,
  /preapproval/i,
  /card_token/i,
  /invalid users involved/i,
  /prisma/i,
  /BILLING_SANDBOX/i,
  /MERCADOPAGO_/i,
  /idempotency/i,
  /apiResponse/i,
];

export function mapBillingErrorMessage(raw?: string | null): string {
  const message = String(raw || "").trim();
  if (!message) {
    return "Não foi possível processar o pagamento. Tente novamente em instantes.";
  }

  const lower = message.toLowerCase();

  if (lower.includes("assinatura") || lower.includes("preapproval") || lower.includes("pix automático")) {
    return message.length <= 200 ? message : "Não foi possível criar a assinatura Pix. Verifique a conta Mercado Pago ou use cartão.";
  }

  if (lower.includes("cpf") || lower.includes("identification") || lower.includes("identific")) {
    return "Informe um CPF válido para gerar o Pix.";
  }

  if (lower.includes("qr code") || lower.includes("chave pix")) {
    return message.length <= 160 ? message : "Não foi possível gerar o QR Code Pix. Verifique a chave Pix na conta Mercado Pago.";
  }

  if (lower.includes("recusad") || lower.includes("rejected") || lower.includes("cc_rejected")) {
    return "Seu cartão foi recusado. Verifique os dados ou tente outro cartão.";
  }

  if (lower.includes("insufficient") || lower.includes("saldo")) {
    return "Pagamento não autorizado por saldo ou limite. Tente outro cartão.";
  }

  if (lower.includes("expirad") || lower.includes("expiration")) {
    return "Cartão vencido. Confira a validade e tente novamente.";
  }

  if (lower.includes("cvv") || lower.includes("security code")) {
    return "Código de segurança (CVV) inválido. Confira e tente novamente.";
  }

  if (lower.includes("invalid users involved")) {
    return "Não foi possível concluir o pagamento de teste. Tente novamente ou use Pix.";
  }

  if (lower.includes("token") && lower.includes("cartão")) {
    return "Não foi possível validar o cartão. Confira os dados e tente novamente.";
  }

  if (lower.includes("produto não encontrado") || lower.includes("plano inválido")) {
    return "Este plano não está disponível no momento. Atualize a página e tente de novo.";
  }

  if (DEV_PATTERNS.some((pattern) => pattern.test(message))) {
    return "Não foi possível processar o pagamento agora. Tente outro método ou aguarde alguns minutos.";
  }

  if (message.length > 160) {
    return "Não foi possível processar o pagamento. Verifique os dados e tente novamente.";
  }

  return message;
}
