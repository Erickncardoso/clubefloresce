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
  const profile = (user.patientProfileData ?? {}) as Record<string, unknown>;

  const lines = [
    `Nome: ${user.name}`,
    `Primeiro nome: ${firstName(user.name)}`,
    `Plano: ${user.plan}`,
    `Membro desde: ${formatDate(user.createdAt)}`,
    `Status: ${user.status}`,
    `Total de check-ins registrados: ${checkIns.length}`,
  ];

  if (profile.gender) lines.push(`Gênero: ${profile.gender}`);
  if (profile.birthDate) lines.push(`Data de nascimento: ${profile.birthDate}`);
  if (profile.heightCm) lines.push(`Altura: ${profile.heightCm} cm`);
  if (profile.weightKg) lines.push(`Peso atual: ${profile.weightKg} kg`);
  if (profile.targetWeightKg) lines.push(`Peso desejado: ${profile.targetWeightKg} kg`);
  if (profile.primaryGoal) lines.push(`Objetivo: ${profile.primaryGoal}`);
  if (profile.workoutsPerWeek) lines.push(`Treinos/semana: ${profile.workoutsPerWeek}`);

  return lines.join("\n");
}
