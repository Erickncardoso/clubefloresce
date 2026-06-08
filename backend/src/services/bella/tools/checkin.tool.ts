import { CheckInRepository } from "../../../repositories/checkin.repository";
import { getWeekStart } from "../../../utils/week-start";
import { buildCheckInSummary, formatDate } from "../context-builder";
import type { BellaToolContext } from "../types";

const checkInRepository = new CheckInRepository();

export const checkinToolDefinition = {
  type: "function" as const,
  function: {
    name: "get_checkin_summary" as const,
    description:
      "Retorna o check-in semanal do paciente: humor, energia, aderência ao plano, peso e observações das últimas semanas.",
    parameters: {
      type: "object",
      properties: {
        weeks: {
          type: "number",
          description: "Quantidade de semanas anteriores a incluir (1-8). Padrão: 4.",
        },
      },
      additionalProperties: false,
    },
  },
};

export async function executeCheckinTool(
  args: Record<string, unknown>,
  ctx: BellaToolContext,
): Promise<string> {
  const weeks = Math.min(8, Math.max(1, Number(args.weeks) || 4));
  const weekStart = getWeekStart();
  const current = await checkInRepository.findByUserAndWeek(ctx.userId, weekStart);
  const history = await checkInRepository.findHistoryByUser(ctx.userId, weeks + 1);

  const lines: string[] = [];

  if (current) {
    lines.push(
      `Semana atual (${formatDate(current.weekStart)}): humor ${current.mood}/5, energia ${current.energy}/5` +
        (current.adherence != null ? `, aderência ${current.adherence}/5` : "") +
        (current.weightKg != null ? `, peso ${current.weightKg} kg` : "") +
        (current.notes ? `. Observações: ${current.notes}` : ""),
    );
  } else {
    lines.push("Sem check-in registrado para a semana atual.");
  }

  const past = history.filter((h) => h.weekStart.getTime() !== weekStart.getTime()).slice(0, weeks);
  for (const item of past) {
    lines.push(
      `${formatDate(item.weekStart)}: humor ${item.mood}/5, energia ${item.energy}/5` +
        (item.adherence != null ? `, aderência ${item.adherence}/5` : "") +
        (item.weightKg != null ? `, peso ${item.weightKg} kg` : "") +
        (item.notes ? `. Notas: ${item.notes}` : ""),
    );
  }

  if (!lines.length) {
    return await buildCheckInSummary(ctx.userId);
  }

  return lines.join("\n");
}
