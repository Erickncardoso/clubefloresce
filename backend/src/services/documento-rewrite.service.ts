import { readEnv } from "../utils/env";
import { OpenAIClient } from "./bella/openai.client";
import { getBellaModels } from "./bella/model-config";

export type DocumentoRewriteMode = "formal" | "simple" | "custom" | "proofread";

/** Remove linhas de metadado que o modelo às vezes cola no HTML (Paciente:/Documento:). */
function stripLeakedMeta(html: string, originalHtml: string): string {
  const originalPlain = originalHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .toLowerCase();
  const hadPaciente = /paciente\s*:/.test(originalPlain);
  const hadDocumento = /documento\s*:/.test(originalPlain);

  let out = html.trim();
  // Remove blocos iniciais tipo <p>Paciente: ...</p>
  const metaBlock =
    /^(?:\s*<(?:p|div|span)[^>]*>\s*)?(?:Paciente|Documento)\s*:\s*[^<]*(?:<\/(?:p|div|span)>\s*)+/i;

  for (let i = 0; i < 4; i += 1) {
    const match = out.match(metaBlock);
    if (!match) break;
    const chunk = match[0].toLowerCase();
    const isPaciente = chunk.includes("paciente");
    const isDocumento = chunk.includes("documento");
    if ((isPaciente && hadPaciente) || (isDocumento && hadDocumento)) break;
    out = out.slice(match[0].length).trim();
  }

  // Texto puro no início (sem tag)
  out = out.replace(/^(?:Paciente|Documento)\s*:[^\n<]*(?:\n|(?=<)|$)/gim, (line) => {
    const lower = line.toLowerCase();
    if (lower.startsWith("paciente") && hadPaciente) return line;
    if (lower.startsWith("documento") && hadDocumento) return line;
    return "";
  });

  return out.trim();
}

export class DocumentoRewriteService {
  private openai = new OpenAIClient();

  async rewrite(input: {
    html: string;
    mode: DocumentoRewriteMode;
    instruction?: string;
    patientName?: string;
    documentTitle?: string;
  }): Promise<{ html: string }> {
    const apiKey = readEnv("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("Reescrita indisponível. Configure OPENAI_API_KEY no servidor.");
    }

    const html = String(input.html || "").trim();
    if (!html) {
      throw new Error("Selecione um trecho de texto para reescrever.");
    }

    const mode: DocumentoRewriteMode =
      input.mode === "simple" || input.mode === "custom" || input.mode === "proofread"
        ? input.mode
        : "formal";
    const customInstruction = String(input.instruction || "").trim();

    if (mode === "custom" && !customInstruction) {
      throw new Error("Descreva como deseja reescrever o trecho.");
    }

    const toneHint =
      mode === "proofread"
        ? [
            "Corrija apenas ortografia, acentuação, digitação e concordância em português do Brasil.",
            "NÃO mude o tom, o sentido clínico, a ordem das informações nem o estilo da nutricionista.",
            "NÃO resuma, NÃO expanda e NÃO reescreva frases que já estejam corretas.",
            "Corrija erros claros (ex.: coids→coisas, nao→não, esta→está quando for verbo).",
          ].join(" ")
        : mode === "formal"
          ? "Reescreva em tom mais formal, adequado a documentos clínicos e declarações."
          : mode === "simple"
            ? "Reescreva em linguagem mais simples e acessível, mantendo o sentido clínico."
            : `Siga esta instrução: ${customInstruction}`;

    const models = getBellaModels();
    const system = [
      "Você é nutricionista clínica do Clube Florescer, revisando documentos do prontuário.",
      toneHint,
      "Responda APENAS com o HTML do conteúdo revisado — sem markdown, sem explicações e sem prefácio.",
      "NUNCA inclua no HTML linhas ou parágrafos começando com 'Paciente:' ou 'Documento:'.",
      "Esses rótulos, se existirem na mensagem do usuário, são só contexto interno — não fazem parte do documento.",
      "Preserve TODAS as tags HTML existentes (p, strong, em, ul, ol, li, table, thead, tbody, tr, td, th, br, img, blockquote, span, div, h1-h6).",
      "NÃO altere estrutura de tabelas — corrija somente o texto visível dentro das células; mantenha as mesmas linhas e colunas.",
      "NÃO remova nem adicione células, linhas ou colunas.",
      "NÃO invente dados clínicos, nomes, datas ou valores que não estejam no trecho.",
      "Mantenha placeholders como ___ quando existirem.",
      "Use português do Brasil.",
    ].join(" ");

    const htmlLimit = mode === "proofread" ? 16000 : 8000;
    const maxTokens = mode === "proofread" ? 4000 : 2000;

    // Na revisão ortográfica o nome/título não ajudam e o modelo costuma colar no texto.
    const userPrompt =
      mode === "proofread"
        ? [
            "Revise o HTML abaixo.",
            "Devolva SOMENTE o mesmo HTML com o texto corrigido.",
            "Não adicione cabeçalhos, títulos, 'Paciente:', 'Documento:' nem qualquer linha extra.",
            "",
            html.slice(0, htmlLimit),
          ].join("\n")
        : [
            "Contexto (NÃO incluir no HTML de saída):",
            input.patientName ? `- Paciente: ${input.patientName}` : null,
            input.documentTitle ? `- Documento: ${input.documentTitle}` : null,
            "",
            "Trecho HTML para reescrever (devolva só este HTML revisado):",
            html.slice(0, htmlLimit),
          ]
            .filter((line) => line != null)
            .join("\n");

    const result = await this.openai.complete({
      model: models.chat,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: mode === "proofread" ? 0.1 : 0.35,
      maxTokens,
    });

    const rewritten = String(result.content || "").trim();
    if (!rewritten) {
      throw new Error(
        mode === "proofread"
          ? "A revisão voltou vazia. Tente novamente."
          : "A reescrita voltou vazia. Tente novamente.",
      );
    }

    const cleaned = stripLeakedMeta(
      rewritten
        .replace(/^```html?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim(),
      html,
    );

    if (!cleaned) {
      throw new Error(
        mode === "proofread"
          ? "A revisão voltou vazia. Tente novamente."
          : "A reescrita voltou vazia. Tente novamente.",
      );
    }

    return { html: cleaned };
  }
}

export const documentoRewriteService = new DocumentoRewriteService();
