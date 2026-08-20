const DEV_PATTERNS = [
  /card_token/i,
  /prisma/i,
  /BILLING_SANDBOX/i,
  /MERCADOPAGO_/i,
  /idempotency/i,
  /apiResponse/i,
];

function isGenericGatewayCode(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (/^(bad_request|invalid_request|unauthorized|forbidden|not_found|error)$/i.test(trimmed)) return true;
  return trimmed.length < 24 && !trimmed.includes(" ") && /^[a-z0-9._-]+$/i.test(trimmed);
}

export function mapBillingErrorMessage(raw?: string | null): string {
  const message = String(raw || "").trim();
  if (!message) {
    return "Não foi possível processar o pagamento. Tente novamente em instantes.";
  }

  const lower = message.toLowerCase();

  if (lower.includes("template") && lower.includes("does not exist")) {
    return "O plano de Pix mensal no Mercado Pago está inválido. Tente de novo em instantes ou use Pix avulso.";
  }

  if (lower.includes("40 character") || lower.includes("more than 40")) {
    return "Não foi possível criar a assinatura Pix. Tente novamente em instantes.";
  }

  if (lower.includes("sandbox") || lower.includes("pix mensal não roda")) {
    return "Pix mensal só funciona em produção. Por enquanto use Pix avulso ou crédito neste ambiente de teste.";
  }

  if (lower.includes("cpf") || lower.includes("identification") || lower.includes("identific")) {
    return "Informe um CPF válido para gerar o Pix.";
  }

  if (lower.includes("qr code") || lower.includes("chave pix")) {
    return message.length <= 160 ? message : "Não foi possível gerar o QR Code Pix. Verifique a chave Pix na conta Mercado Pago.";
  }

  if (
    lower.includes("débito")
    || lower.includes("debito")
    || lower.includes("debit")
  ) {
    return "Aceitamos só cartão de crédito (Visa, Mastercard, Elo, Amex ou Diners) ou Pix.";
  }

  if (
    lower.includes("payment_method")
    || lower.includes("payment method")
    || lower.includes("bandeira")
    || lower.includes("cannot get payment method")
  ) {
    return "Use um cartão de crédito Visa, Mastercard, Elo, Amex ou Diners, ou pague com Pix.";
  }

  if (lower.includes("recusad") || lower.includes("rejected") || lower.includes("cc_rejected")) {
    return "Seu cartão foi recusado. Verifique os dados ou tente outro cartão.";
  }

  if (lower.includes("insufficient") || (lower.includes("saldo") && !lower.includes("mensal"))) {
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

  if (isGenericGatewayCode(message) || message.length > 200) {
    return "Não foi possível processar o pagamento. Verifique os dados e tente novamente.";
  }

  return message;
}
