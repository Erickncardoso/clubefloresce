import { CheckInRepository } from "../../../repositories/checkin.repository";
import { UserRepository } from "../../../repositories/user.repository";
import { formatDate, firstName } from "../context-builder";
import type { BellaToolContext } from "../types";

const userRepository = new UserRepository();
const checkInRepository = new CheckInRepository();

export const userProfileToolDefinition = {
  type: "function" as const,
  function: {
    name: "get_user_profile" as const,
    description: "Retorna dados básicos do paciente na plataforma: nome, plano, data de cadastro e total de check-ins.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
};

export async function executeUserProfileTool(_args: Record<string, unknown>, ctx: BellaToolContext): Promise<string> {
  const user = await userRepository.findById(ctx.userId);
  if (!user) return "Perfil não encontrado.";

  const checkIns = await checkInRepository.findHistoryByUser(ctx.userId, 52);

  return [
    `Nome: ${user.name}`,
    `Primeiro nome: ${firstName(user.name)}`,
    `Plano: ${user.plan}`,
    `Membro desde: ${formatDate(user.createdAt)}`,
    `Status: ${user.status}`,
    `Total de check-ins registrados: ${checkIns.length}`,
  ].join("\n");
}
