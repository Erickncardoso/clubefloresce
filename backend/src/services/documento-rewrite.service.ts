import { readEnv } from "../utils/env";
import { OpenAIClient } from "./bella/openai.client";
import { getBellaModels } from "./bella/model-config";

export type DocumentoRewriteMode = "formal" | "simple" | "custom";

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

    const mode = input.mode === "simple" || input.mode === "custom" ? input.mode : "formal";
    const customInstruction = String(input.instruction || "").trim();

    if (mode === "custom" && !customInstruction) {
      throw new Error("Descreva como deseja reescrever o trecho.");
    }

    const toneHint =
      mode === "formal"
        ? "Reescreva em tom mais formal, adequado a documentos clínicos e declarações."
        : mode === "simple"
          ? "Reescreva em linguagem mais simples e acessível, mantendo o sentido clínico."
          : `Siga esta instrução: ${customInstruction}`;

    const models = getBellaModels();
    const system = [
      "Você é nutricionista clínica do Clube Florescer, revisando documentos do prontuário.",
      toneHint,
      "Responda APENAS com HTML válido, sem markdown e sem explicações.",
      "Preserve todas as tags HTML existentes (p, strong, em, ul, ol, li, table, tr, td, th, br, img).",
      "NÃO altere estrutura de tabelas — reescreva somente o texto visível dentro das células.",
      "NÃO invente dados clínicos, nomes, datas ou valores que não estejam no trecho.",
      "Mantenha placeholders como ___ quando existirem.",
      "Use português do Brasil.",
    ].join(" ");

    const userPrompt = [
      input.patientName ? `Paciente: ${input.patientName}` : null,
      input.documentTitle ? `Documento: ${input.documentTitle}` : null,
      "",
      "Trecho HTML para reescrever:",
      html.slice(0, 8000),
    ]
      .filter((line) => line != null)
      .join("\n");

    const result = await this.openai.complete({
      model: models.chat,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.35,
      maxTokens: 2000,
    });

    const rewritten = String(result.content || "").trim();
    if (!rewritten) {
      throw new Error("A reescrita voltou vazia. Tente novamente.");
    }

    const cleaned = rewritten
      .replace(/^```html?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    return { html: cleaned };
  }
}

export const documentoRewriteService = new DocumentoRewriteService();
