import { PrismaClient } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type { BellaToolContext } from "../types";

export const contentSearchToolDefinition = {
  type: "function" as const,
  function: {
    name: "search_educational_content" as const,
    description:
      "Busca cursos e ebooks por palavra-chave ou tema (ex: hidratação, proteína, receitas, metabolismo).",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Termo ou tema a buscar.",
        },
        limit: {
          type: "number",
          description: "Máximo de resultados (1-10). Padrão: 5.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function scoreText(haystack: string, query: string): number {
  const h = normalize(haystack);
  const q = normalize(query.trim());
  if (!q) return 0;
  if (h.includes(q)) return 10;
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.reduce((acc, token) => (h.includes(token) ? acc + 3 : acc), 0);
}

export async function executeContentSearchTool(
  args: Record<string, unknown>,
  _ctx: BellaToolContext,
): Promise<string> {
  const query = String(args.query || "").trim();
  const limit = Math.min(10, Math.max(1, Number(args.limit) || 5));

  if (!query) {
    return "Informe um termo de busca (ex: hidratação, lanche, receitas).";
  }

  const [courses, ebooks] = await Promise.all([
    prisma.course.findMany({
      include: { modules: { select: { id: true } } },
    }),
    prisma.ebook.findMany(),
  ]);

  type Ranked = { score: number; line: string };

  const ranked: Ranked[] = [];

  for (const course of courses) {
    const text = `${course.title} ${course.description || ""}`;
    const score = scoreText(text, query);
    if (score > 0) {
      ranked.push({
        score,
        line: `[Curso] ${course.title}: ${course.description || "Sem descrição"} (${course.modules.length} módulos)`,
      });
    }
  }

  for (const ebook of ebooks) {
    const text = `${ebook.title} ${ebook.description}`;
    const score = scoreText(text, query);
    if (score > 0) {
      ranked.push({
        score,
        line: `[Ebook] ${ebook.title}: ${ebook.description}`,
      });
    }
  }

  ranked.sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, limit);

  if (!top.length) {
    return `Nenhum conteúdo encontrado para "${query}". Sugira explorar a Biblioteca ou perguntar à nutricionista.`;
  }

  return top.map((r) => r.line).join("\n");
}
