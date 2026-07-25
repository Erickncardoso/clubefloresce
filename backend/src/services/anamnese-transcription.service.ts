import { readEnv } from "../utils/env";
import { OpenAIClient } from "./bella/openai.client";
import { getBellaModels } from "./bella/model-config";

const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_TRANSCRIBE_TIMEOUT_MS = Number(process.env.OPENAI_TRANSCRIBE_TIMEOUT_MS || 120_000);
const DIARIZE_MODEL = process.env.OPENAI_MODEL_ANAMNESE_DIARIZE?.trim() || "gpt-4o-transcribe-diarize";
const WHISPER_MODEL = process.env.OPENAI_MODEL_WHISPER?.trim() || "whisper-1";

type DiarizedSegment = {
  speaker?: string;
  text?: string;
  start?: number;
  end?: number;
};

type MergedSegment = {
  speaker: string;
  text: string;
};

export class AnamneseTranscriptionService {
  private openai = new OpenAIClient();

  async transcribeAudio(file: {
    buffer: Buffer;
    originalname?: string;
    mimetype?: string;
  }): Promise<{ text: string }> {
    const apiKey = readEnv("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("Transcrição indisponível. Configure OPENAI_API_KEY no servidor.");
    }

    if (!file?.buffer?.length) {
      throw new Error("Áudio vazio.");
    }

    try {
      return await this.transcribeDiarized(file, apiKey);
    } catch (diarizeError: any) {
      console.warn(
        "[AnamneseWhisper] diarização indisponível, usando fallback:",
        String(diarizeError?.message || diarizeError).slice(0, 200),
      );
      return this.transcribePlainAndFormat(file, apiKey);
    }
  }

  async interpretAnamnese(input: {
    title?: string;
    content: string;
    patientName?: string;
  }): Promise<{ interpretation: string }> {
    const apiKey = readEnv("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("Interpretação indisponível. Configure OPENAI_API_KEY no servidor.");
    }

    const content = String(input.content || "").trim();
    if (!content) {
      throw new Error("Escreva ou transcreva a anamnese antes de interpretar.");
    }

    const models = getBellaModels();
    const system = [
      "Você é nutricionista clínica do Clube Florescer.",
      "Interprete a anamnese de forma objetiva, acolhedora e prática.",
      "Responda em português do Brasil, em texto corrido com tópicos curtos.",
      "Estruture: queixas principais, hábitos relevantes, riscos/alertas e hipóteses de conduta nutricional.",
      "Não invente dados que não estejam no texto. Não use markdown pesado.",
    ].join(" ");

    const userPrompt = [
      input.patientName ? `Paciente: ${input.patientName}` : null,
      input.title ? `Título: ${input.title}` : null,
      "",
      "Anamnese:",
      content.slice(0, 12000),
    ].filter((line) => line != null).join("\n");

    const result = await this.openai.complete({
      model: models.chat,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      maxTokens: 1200,
    });

    const text = String(result.content || "").trim();
    if (!text) {
      throw new Error("A interpretação voltou vazia. Tente novamente.");
    }
    return { interpretation: text };
  }

  private buildUploadForm(file: {
    buffer: Buffer;
    originalname?: string;
    mimetype?: string;
  }, fields: Record<string, string>) {
    const filename = String(file.originalname || "anamnese.webm").replace(/[^\w.\-]+/g, "_");
    const mime = String(file.mimetype || "audio/webm").split(";")[0].trim() || "audio/webm";
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value);
    }
    form.append(
      "file",
      new Blob([new Uint8Array(file.buffer)], { type: mime }),
      filename,
    );
    return form;
  }

  private async callOpenAiTranscription(apiKey: string, form: FormData) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_TRANSCRIBE_TIMEOUT_MS);

    try {
      const res = await fetch(OPENAI_TRANSCRIBE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
        signal: controller.signal,
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[AnamneseWhisper]", res.status, detail.slice(0, 500));
        throw new Error(`OpenAI transcription failed (${res.status})`);
      }

      return await res.json() as {
        text?: string;
        segments?: DiarizedSegment[];
      };
    } catch (error: any) {
      if (error?.name === "AbortError") {
        throw new Error("A transcrição demorou demais. Tente um áudio mais curto.");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async transcribeDiarized(
    file: { buffer: Buffer; originalname?: string; mimetype?: string },
    apiKey: string,
  ): Promise<{ text: string }> {
    const form = this.buildUploadForm(file, {
      model: DIARIZE_MODEL,
      language: "pt",
      response_format: "diarized_json",
      chunking_strategy: "auto",
    });

    const data = await this.callOpenAiTranscription(apiKey, form);
    const segments = Array.isArray(data.segments) ? data.segments : [];

    if (!segments.length) {
      const plain = String(data.text || "").trim();
      if (!plain) {
        throw new Error("A transcrição voltou vazia. Grave novamente com mais clareza.");
      }
      const formatted = await this.formatPlainTranscript(plain);
      return { text: formatted };
    }

    const merged = mergeDiarizedSegments(segments);
    const formatted = await this.formatSpeakerSegments(merged);
    if (!formatted) {
      throw new Error("A transcrição voltou vazia. Grave novamente com mais clareza.");
    }
    return { text: formatted };
  }

  private async transcribePlainAndFormat(
    file: { buffer: Buffer; originalname?: string; mimetype?: string },
    apiKey: string,
  ): Promise<{ text: string }> {
    const form = this.buildUploadForm(file, {
      model: WHISPER_MODEL,
      language: "pt",
      response_format: "json",
    });

    const data = await this.callOpenAiTranscription(apiKey, form);
    const plain = String(data.text || "").trim();
    if (!plain) {
      throw new Error("A transcrição voltou vazia. Grave novamente com mais clareza.");
    }

    const formatted = await this.formatPlainTranscript(plain);
    return { text: formatted };
  }

  private async formatSpeakerSegments(segments: MergedSegment[]): Promise<string> {
    if (!segments.length) return "";

    if (segments.length === 1) {
      return `[Paciente]: ${segments[0].text}`;
    }

    const transcript = segments
      .map((segment) => `Locutor ${segment.speaker}: ${segment.text}`)
      .join("\n");

    const formatted = await this.formatPlainTranscript(transcript, true);
    return formatted;
  }

  private async formatPlainTranscript(raw: string, hasSpeakerIds = false): Promise<string> {
    const models = getBellaModels();
    const system = [
      "Você formata transcrições de consultas de nutrição entre paciente e nutricionista.",
      "Regras:",
      "- Identifique corretamente quem é Paciente e quem é Nutricionista pelo contexto.",
      "- Nutricionista: perguntas clínicas, orientações profissionais, conduta.",
      "- Paciente: relato de hábitos, sintomas, rotina, respostas pessoais.",
      "- Saída SOMENTE em linhas no formato exato: [Paciente]: texto ou [Nutricionista]: texto",
      "- Uma fala por linha.",
      "- Não invente conteúdo. Preserve o sentido original.",
      hasSpeakerIds
        ? "- Os rótulos 'Locutor X' são IDs automáticos; mapeie cada um para Paciente ou Nutricionista."
        : "- Separe falas alternadas quando possível.",
    ].join("\n");

    const result = await this.openai.complete({
      model: models.chat,
      messages: [
        { role: "system", content: system },
        { role: "user", content: raw.slice(0, 14000) },
      ],
      temperature: 0.15,
      maxTokens: 4000,
    });

    const text = normalizeFormattedTranscript(String(result.content || "").trim());
    if (text) return text;

    return raw
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => (line.startsWith("[") ? line : `[Paciente]: ${line}`))
      .join("\n");
  }
}

function mergeDiarizedSegments(segments: DiarizedSegment[]): MergedSegment[] {
  const merged: MergedSegment[] = [];

  for (const segment of segments) {
    const speaker = String(segment.speaker || "A").trim() || "A";
    const text = String(segment.text || "").trim();
    if (!text) continue;

    const last = merged[merged.length - 1];
    if (last && last.speaker === speaker) {
      last.text = `${last.text} ${text}`.trim();
    } else {
      merged.push({ speaker, text });
    }
  }

  return merged;
}

function normalizeFormattedTranscript(raw: string): string {
  return raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[(Paciente|Nutricionista)\]\s*:?\s*(.*)$/i);
      if (!match) return line;
      const role = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      const normalizedRole = role === "Paciente" ? "Paciente" : "Nutricionista";
      const text = match[2].trim();
      return `[${normalizedRole}]: ${text}`;
    })
    .join("\n");
}

export const anamneseTranscriptionService = new AnamneseTranscriptionService();
