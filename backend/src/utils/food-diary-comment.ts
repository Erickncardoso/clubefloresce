const MAX = 1000;

export function normalizeFoodDiaryCommentContent(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new Error("Conteúdo do comentário é obrigatório.");
  }
  const content = raw.trim();
  if (!content) {
    throw new Error("Conteúdo do comentário é obrigatório.");
  }
  if (content.length > MAX) {
    throw new Error(`Comentário deve ter no máximo ${MAX} caracteres.`);
  }
  return content;
}
