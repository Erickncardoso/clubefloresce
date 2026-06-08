import { CourseRepository } from "../../../repositories/course.repository";
import type { BellaToolContext } from "../types";

const courseRepository = new CourseRepository();

export const coursesToolDefinition = {
  type: "function" as const,
  function: {
    name: "list_recommended_courses" as const,
    description:
      "Lista cursos e trilhas educacionais disponíveis na plataforma para recomendar ao paciente.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Quantidade máxima de cursos (1-10). Padrão: 5.",
        },
      },
      additionalProperties: false,
    },
  },
};

export async function executeCoursesTool(args: Record<string, unknown>): Promise<string> {
  const limit = Math.min(10, Math.max(1, Number(args.limit) || 5));
  const courses = await courseRepository.findAll();

  if (!courses.length) {
    return "Nenhum curso disponível na biblioteca no momento.";
  }

  return courses.slice(0, limit).map((course) => {
    const withModules = course as { modules?: { lessons?: unknown[] }[] };
    const moduleCount = withModules.modules?.length ?? 0;
    const lessonCount =
      withModules.modules?.reduce((acc, mod) => acc + (mod.lessons?.length ?? 0), 0) ?? 0;
    const desc = course.description?.trim() || "Sem descrição.";
    return `- ${course.title}: ${desc} (${moduleCount} módulos, ${lessonCount} aulas)`;
  }).join("\n");
}

// ctx reservado para futuras recomendações personalizadas por progresso
export async function executeCoursesToolForUser(
  args: Record<string, unknown>,
  _ctx: BellaToolContext,
): Promise<string> {
  return executeCoursesTool(args);
}
