import crypto from "crypto";
import { readEnv } from "../../utils/env";
import { cacheService } from "../cache.service";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "./types";

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_TIMEOUT_MS = Number(process.env.RAG_EMBEDDING_TIMEOUT_MS || 30_000);
const CACHE_TTL_SECONDS = Number(process.env.RAG_EMBEDDING_CACHE_TTL || 3600);
/** OpenAI limita cada input a 8192 tokens — ~6k chars é margem segura. */
const MAX_EMBED_INPUT_CHARS = Number(process.env.RAG_MAX_EMBED_INPUT_CHARS || 6000);

function truncateForEmbedding(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_EMBED_INPUT_CHARS) return normalized;
  return `${normalized.slice(0, MAX_EMBED_INPUT_CHARS)}…`;
}

function cacheKey(text: string): string {
  const hash = crypto.createHash("sha256").update(text).digest("hex");
  return `rag:emb:${EMBEDDING_MODEL}:${hash}`;
}

export class EmbeddingService {
  private apiKey: string | null;

  constructor() {
    this.apiKey = readEnv("OPENAI_API_KEY");
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  async embedText(text: string): Promise<number[]> {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) {
      throw new Error("Texto vazio para embedding.");
    }

    const cached = await cacheService.getJson<number[]>(cacheKey(normalized)).catch(() => null);
    if (cached?.length === EMBEDDING_DIMENSIONS) return cached;

    const [embedding] = await this.embedBatch([normalized]);
    await cacheService.setJson(cacheKey(normalized), embedding, CACHE_TTL_SECONDS).catch(() => undefined);
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY ausente — embeddings indisponíveis.");
    }

    const inputs = texts
      .map((text) => truncateForEmbedding(text))
      .filter(Boolean);

    if (!inputs.length) return [];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);

    try {
      const res = await fetch(OPENAI_EMBEDDINGS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: inputs,
          dimensions: EMBEDDING_DIMENSIONS,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI embeddings error (${res.status}): ${errText.slice(0, 200)}`);
      }

      const json = (await res.json()) as {
        data?: { embedding?: number[]; index?: number }[];
      };

      const rows = json.data || [];
      rows.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      return rows.map((row) => row.embedding || []);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const embeddingService = new EmbeddingService();
