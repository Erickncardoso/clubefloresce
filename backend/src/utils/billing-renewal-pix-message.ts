export function formatBillingBrl(amount: number): string {
  return Number(amount || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function buildRenewalPixWhatsappText(input: {
  firstName: string;
  amount: number;
  pixCopyPaste: string;
}): string {
  const first = String(input.firstName || "").trim() || "olá";
  const code = String(input.pixCopyPaste || "").trim();
  return [
    `Olá, *${first}*! 🌿`,
    "",
    `Sua mensalidade do *Clube Florescer* (${formatBillingBrl(input.amount)}) vence hoje.`,
    "",
    "Pague com Pix copia e cola (válido por 24h):",
    "",
    code,
    "",
    "Quando o pagamento cair, o acesso libera sozinho.",
  ].join("\n");
}
