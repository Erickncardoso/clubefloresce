import { Prisma, Role } from "@prisma/client";
import { CheckInTemplateRepository } from "../repositories/checkin-template.repository";
import { CheckInRepository } from "../repositories/checkin.repository";
import { UserRepository } from "../repositories/user.repository";
import { getWeekStart } from "../utils/week-start";
import { readPatientDateKey, resolvePeriodKey as resolvePeriodKeyForDate } from "../utils/patient-local-date";

const templateRepository = new CheckInTemplateRepository();
const checkInRepository = new CheckInRepository();
const userRepository = new UserRepository();

export const DEFAULT_CHECKIN_STEPS = [
  {
    id: "food",
    type: "food",
    label: "Alimentação",
    question: "Como foi sua alimentação hoje?",
    hint: "Toque no rosto que mais combina com o seu dia.",
  },
  {
    id: "water",
    type: "water",
    label: "Água",
    question: "Quantos copos de água você bebeu?",
    hint: "Conte apenas copos padrão, de cerca de 200 ml.",
  },
  {
    id: "exercise",
    type: "exercise",
    label: "Exercício",
    question: "Você praticou atividade física hoje?",
    hint: "Caminhada, musculação, yoga ou qualquer movimento conta.",
  },
  {
    id: "sleep",
    type: "scale",
    label: "Sono",
    question: "Como você dormiu?",
    hint: "Toque nas estrelas de 1 (péssimo) a 5 (excelente).",
    min: 1,
    max: 5,
  },
];

const STEP_TYPES = new Set(["food", "water", "exercise", "scale", "choice", "text"]);

function validateSteps(steps: unknown): any[] {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error("Adicione pelo menos uma pergunta ao check-in.");
  }
  if (steps.length > 20) {
    throw new Error("Máximo de 20 perguntas por check-in.");
  }

  return steps.map((raw, index) => {
    const step = raw as Record<string, unknown>;
    const id = String(step.id || `step_${index + 1}`).trim();
    const type = String(step.type || "text").trim();
    const question = String(step.question || "").trim();

    if (!id) throw new Error(`Pergunta ${index + 1}: id inválido.`);
    if (!STEP_TYPES.has(type)) throw new Error(`Pergunta ${index + 1}: tipo inválido.`);
    if (!question) throw new Error(`Pergunta ${index + 1}: texto obrigatório.`);

    return {
      id,
      type,
      label: String(step.label || `Pergunta ${index + 1}`).trim(),
      question,
      hint: step.hint ? String(step.hint).trim() : "",
      min: step.min != null ? Number(step.min) : undefined,
      max: step.max != null ? Number(step.max) : undefined,
      options: Array.isArray(step.options) ? step.options : undefined,
    };
  });
}

function resolvePeriodKey(frequency: string, dateKey?: string | null): string {
  return resolvePeriodKeyForDate(frequency, dateKey);
}

function waterToEnergy(glasses: number): number {
  if (glasses <= 2) return 1;
  if (glasses <= 4) return 2;
  if (glasses <= 6) return 3;
  if (glasses <= 8) return 4;
  return 5;
}

async function syncLegacyWeeklyCheckIn(userId: string, answers: Record<string, unknown>) {
  const food = answers.food != null ? Number(answers.food) : null;
  const water = answers.water != null ? Number(answers.water) : null;
  const exercise = answers.exercise;
  const sleep = answers.sleep != null ? Number(answers.sleep) : null;

  if (food == null && water == null && exercise == null && sleep == null) return;

  const weekStart = getWeekStart();
  const notesParts: string[] = [];
  if (water != null && Number.isFinite(water)) notesParts.push(`Água: ${water} copos.`);
  if (exercise != null) notesParts.push(`Exercício: ${exercise ? "Sim" : "Não"}.`);

  await checkInRepository.upsert({
    userId,
    weekStart,
    mood: sleep != null && Number.isFinite(sleep) ? Math.min(5, Math.max(1, Math.round(sleep))) : 3,
    energy: water != null && Number.isFinite(water) ? waterToEnergy(water) : 3,
    adherence: food != null && Number.isFinite(food) ? Math.min(5, Math.max(1, Math.round(food))) : null,
    weightKg: null,
    notes: notesParts.length ? notesParts.join(" ") : null,
  });
}

export class CheckInTemplateService {
  async ensureDefaultTemplate(authorId: string) {
    const count = await templateRepository.count();
    if (count > 0) return;

    await templateRepository.create({
      title: "Check-in semanal",
      description: "Alimentação, água, exercício e sono da semana.",
      frequency: "weekly",
      active: true,
      steps: DEFAULT_CHECKIN_STEPS as Prisma.InputJsonValue,
      sortOrder: 0,
      isDefault: true,
      authorId,
    });
  }

  async listForNutri(authorId: string) {
    await this.ensureDefaultTemplate(authorId);
    return templateRepository.findAllForNutri();
  }

  async listActiveForPatient() {
    const templates = await templateRepository.findActiveForPatients();
    if (templates.length > 0) return templates;

    const nutri = (await userRepository.findAll()).find((u) => u.role === Role.NUTRICIONISTA);
    if (!nutri) return [];
    await this.ensureDefaultTemplate(nutri.id);
    return templateRepository.findActiveForPatients();
  }

  async createTemplate(authorId: string, data: any) {
    const steps = validateSteps(data.steps);
    return templateRepository.create({
      title: String(data.title || "").trim(),
      description: data.description ? String(data.description).trim() : null,
      frequency: ["weekly", "daily", "monthly"].includes(data.frequency) ? data.frequency : "weekly",
      active: data.active !== false,
      steps,
      sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0,
      authorId,
    });
  }

  async updateTemplate(id: string, authorId: string, data: any) {
    const existing = await templateRepository.findById(id);
    if (!existing) throw new Error("Check-in não encontrado.");
    if (existing.authorId !== authorId) throw new Error("Acesso negado.");

    const payload: Record<string, unknown> = {};
    if (data.title != null) payload.title = String(data.title).trim();
    if (data.description != null) payload.description = String(data.description).trim() || null;
    if (data.frequency != null && ["weekly", "daily", "monthly"].includes(data.frequency)) {
      payload.frequency = data.frequency;
    }
    if (data.active != null) payload.active = Boolean(data.active);
    if (data.sortOrder != null) payload.sortOrder = Number(data.sortOrder) || 0;
    if (data.steps != null) payload.steps = validateSteps(data.steps) as Prisma.InputJsonValue;

    return templateRepository.update(id, payload);
  }

  async deleteTemplate(id: string, authorId: string) {
    const existing = await templateRepository.findById(id);
    if (!existing) throw new Error("Check-in não encontrado.");
    if (existing.authorId !== authorId) throw new Error("Acesso negado.");
    if (existing.isDefault) throw new Error("O check-in padrão não pode ser excluído.");
    return templateRepository.delete(id);
  }

  async submitResponse(
    userId: string,
    templateId: string,
    answers: Record<string, unknown>,
    headers?: Record<string, string | string[] | undefined>,
  ) {
    const template = await templateRepository.findById(templateId);
    if (!template || !template.active) throw new Error("Check-in indisponível.");

    const dateKey = readPatientDateKey(headers);
    const periodKey = resolvePeriodKey(template.frequency, dateKey);
    const response = await templateRepository.upsertResponse({
      userId,
      templateId,
      periodKey,
      answers: answers as Prisma.InputJsonValue,
    });

    const stepIds = new Set((template.steps as any[]).map((s) => s.id));
    if (stepIds.has("food") || stepIds.has("water") || stepIds.has("exercise") || stepIds.has("sleep")) {
      await syncLegacyWeeklyCheckIn(userId, answers);
    }

    return response;
  }

  async getPatientContext(
    userId: string,
    templateId: string,
    headers?: Record<string, string | string[] | undefined>,
  ) {
    const template = await templateRepository.findById(templateId);
    if (!template || !template.active) throw new Error("Check-in indisponível.");

    const dateKey = readPatientDateKey(headers);
    const periodKey = resolvePeriodKey(template.frequency, dateKey);
    const current = await templateRepository.findResponse(userId, templateId, periodKey);
    const history = await templateRepository.findResponsesByUser(userId, 12, templateId);

    return { template, periodKey, current, history };
  }

  async listMyResponses(userId: string) {
    return templateRepository.findResponsesByUser(userId, 48);
  }

  async getResponseById(id: string) {
    const response = await templateRepository.findResponseById(id);
    if (!response) throw new Error("Resposta não encontrada.");
    return response;
  }

  async listPatientResponses(userId: string) {
    return templateRepository.findResponsesByUser(userId, 48);
  }

  async listResponsesForNutri() {
    return templateRepository.findResponsesForNutri(120);
  }
}
