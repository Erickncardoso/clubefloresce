/** Dicas de formatação nativa do WhatsApp (Markdown simplificado). */
export const WHATSAPP_FORMAT_HINT =
  "Use *negrito*, _itálico_, ~riscado~. Deixe {{linkApp}} em linha separada para gerar o card com miniatura.";

/** Normaliza texto antes do envio via UAZAPI (quebras de linha e entidades HTML comuns). */
export function normalizeWhatsappOutgoingText(text: string): string {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** Garante URL em linha isolada, sem espaçamento exagerado. */
export function finalizeApprovalWhatsappLayout(text: string): string {
  let output = normalizeWhatsappOutgoingText(text);

  output = output.replace(/^(•[^\n]+)\n\n+(•)/gm, "$1\n$2");
  output = output.replace(/👇\n\n+(?=(?:https?:\/\/|\{\{linkApp\}\}))/g, "👇\n");
  output = output.replace(/\n{2,}((?:https?:\/\/[^\s]+|\{\{linkApp\}\}))/g, "\n$1");
  output = output.replace(/((?:https?:\/\/[^\s]+|\{\{linkApp\}\}))\n\n+(?=•)/g, "$1\n");
  output = output.replace(/\n{3,}/g, "\n\n");

  return output.trim();
}

function collapseDuplicateAsterisks(text: string): string {
  return text
    .replace(/\*{3,}/g, "*")
    .replace(/\*([^*\n]+)\*\*/g, "*$1*");
}

/** Detecta templates antigos sem formatação WhatsApp adequada. */
export function isLegacyApprovalTemplate(text: string): boolean {
  const normalized = normalizeWhatsappOutgoingText(text);
  if (!normalized) return true;

  return (
    normalized.includes("Ou acesse:") ||
    normalized.includes("Ou acesse: {{linkApp}}") ||
    !normalized.includes("*Como entrar:*") ||
    /Como entrar:\s*\n\s*1\./.test(normalized) ||
    !/\*Clube Florescer\*/.test(normalized) ||
    /•[^\n]+\n\n•/.test(normalized) ||
    /👇\n\n(?:https?:\/\/|\{\{linkApp\}\})/.test(normalized)
  );
}

/** Aplica negrito e quebras compatíveis com WhatsApp em templates legados. */
export function upgradeApprovalTemplate(text: string): string {
  let output = normalizeWhatsappOutgoingText(text);

  output = output.replace(/^Como entrar:\s*$/gm, "*Como entrar:*");
  output = output.replace(/^Como entrar:\s*\n(?=\d+\.)/gm, "*Como entrar:*\n\n");

  output = output.replace(/^Olá,\s+([^!\n*]+)!/m, (_, name) => `Olá, *${String(name).trim()}*!`);
  output = output.replace(
    /(?<!\*)\bClube Florescer\b(?!\*)/g,
    "*Clube Florescer*",
  );

  output = output.replace(
    /2\.\s*Ou acesse:\s*\n\s*(https?:\/\/[^\s]+)/g,
    "• Toque no link abaixo 👇\n\n$1",
  );
  output = output.replace(
    /2\.\s*Ou acesse:\s*\{\{linkApp\}\}/g,
    "• Toque no link abaixo 👇\n\n{{linkApp}}",
  );
  output = output.replace(
    /2\.\s*Ou toque no link abaixo para abrir o app\.\s*\n\s*3\.\s*/g,
    "• Toque no link abaixo 👇\n\n{{linkApp}}\n\n• ",
  );

  output = output.replace(/^(\d+)\.\s+/gm, "• ");
  output = output.replace(/([^\n])\n(https?:\/\/)/g, "$1\n\n$2");
  output = output.replace(/\n{3,}/g, "\n\n");

  return finalizeApprovalWhatsappLayout(collapseDuplicateAsterisks(output));
}
