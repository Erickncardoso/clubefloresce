import { prisma } from "../lib/prisma";
import { getWeekStart } from "../utils/week-start";
import { entryDateFromKey, getDateKeyInTimeZone } from "../utils/patient-timezone";
import { normalizePhoneForWhatsapp } from "../utils/phone";

export type EngagementZone = "danger" | "attention" | "success";

type PatientRow = {
  id: string;
  name: string;
  avatar: string | null;
  phone: string | null;
  patientGoalsData: unknown;
};

function daysAgoDate(days: number): Date {
  const d = new Date();
  d.setTime(d.getTime() - days * 24 * 60 * 60 * 1000);
  return d;
}

function entryDateDaysAgo(days: number): Date {
  const key = getDateKeyInTimeZone("America/Sao_Paulo", daysAgoDate(days));
  return entryDateFromKey(key);
}

function countWaterPostsInRange(patientGoalsData: unknown, fromKey: string, toKey: string): number {
  const progress =
    patientGoalsData &&
    typeof patientGoalsData === "object" &&
    (patientGoalsData as { progress?: Record<string, unknown> }).progress &&
    typeof (patientGoalsData as { progress?: unknown }).progress === "object"
      ? ((patientGoalsData as { progress: Record<string, unknown> }).progress || {})
      : {};

  let count = 0;
  for (const [key, value] of Object.entries(progress)) {
    if (!key.startsWith("water:")) continue;
    const dateKey = key.slice("water:".length);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    if (dateKey < fromKey || dateKey > toKey) continue;
    if (Number(value) > 0) count += 1;
  }
  return count;
}

function questionnaireFillLevel(
  answers: unknown,
  steps: unknown,
): "none" | "partial" | "complete" {
  const stepIds = Array.isArray(steps)
    ? steps
        .map((step) => (step && typeof step === "object" ? String((step as { id?: string }).id || "") : ""))
        .filter(Boolean)
    : [];

  if (!stepIds.length) {
    if (!answers || typeof answers !== "object") return "none";
    const keys = Object.keys(answers as Record<string, unknown>).filter((k) => {
      const v = (answers as Record<string, unknown>)[k];
      return v != null && String(v).trim() !== "";
    });
    if (!keys.length) return "none";
    return "complete";
  }

  if (!answers || typeof answers !== "object") return "none";
  const answered = stepIds.filter((id) => {
    const v = (answers as Record<string, unknown>)[id];
    return v != null && String(v).trim() !== "";
  }).length;

  if (answered <= 0) return "none";
  if (answered >= stepIds.length) return "complete";
  return "partial";
}

function phoneToJidCandidates(phone: string | null): string[] {
  const digits = normalizePhoneForWhatsapp(phone);
  if (!digits) return [];
  const variants = new Set<string>([digits]);
  if (digits.startsWith("55") && digits.length >= 12) {
    const local = digits.slice(2);
    variants.add(local);
    if (local.length === 11) variants.add(`55${local.slice(0, 2)}${local.slice(3)}`);
    if (local.length === 10) variants.add(`55${local.slice(0, 2)}9${local.slice(2)}`);
  }
  return [...variants].map((d) => `${d}@s.whatsapp.net`);
}

function isSuccessZone(input: {
  foodPostsWeek: number;
  waterPostsWeek: number;
  chatReplyWithinDays: number | null;
  hasSchedule: boolean;
  questionnaire: "none" | "partial" | "complete";
}): boolean {
  if (input.foodPostsWeek >= 4) return true;
  if (input.waterPostsWeek >= 4) return true;
  if (
    input.chatReplyWithinDays != null &&
    input.chatReplyWithinDays <= 3 &&
    input.hasSchedule &&
    input.questionnaire === "complete"
  ) {
    return true;
  }
  return false;
}

function isAttentionZone(input: {
  foodPosts7d: number;
  waterPosts7d: number;
  chatReplyWithinDays: number | null;
  hasSchedule: boolean;
  questionnaire: "none" | "partial" | "complete";
}): boolean {
  if (input.foodPosts7d >= 1) return true;
  if (input.waterPosts7d >= 1) return true;
  if (
    input.chatReplyWithinDays != null &&
    input.chatReplyWithinDays <= 7 &&
    input.hasSchedule &&
    input.questionnaire === "partial"
  ) {
    return true;
  }
  return false;
}

export class EngagementZonesService {
  async getZonesForNutri() {
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekStartKey = weekStart.toISOString().slice(0, 10);
    const todayKey = getDateKeyInTimeZone("America/Sao_Paulo", now);
    const sevenDaysAgo = daysAgoDate(7);
    const sevenDaysAgoEntry = entryDateDaysAgo(7);
    const sevenDaysAgoKey = sevenDaysAgoEntry.toISOString().slice(0, 10);

    const patients = (await prisma.user.findMany({
      where: { role: "PACIENTE" },
      select: {
        id: true,
        name: true,
        avatar: true,
        phone: true,
        patientGoalsData: true,
      },
      orderBy: { name: "asc" },
    })) as PatientRow[];

    if (!patients.length) {
      return {
        weekStart: weekStartKey,
        zones: { danger: [], attention: [], success: [] },
        counts: { danger: 0, attention: 0, success: 0 },
      };
    }

    const patientIds = patients.map((p) => p.id);

    const [foodWeek, food7d, responses, schedules, nutriUsers] = await Promise.all([
      prisma.foodDiaryEntry.groupBy({
        by: ["userId"],
        where: { userId: { in: patientIds }, entryDate: { gte: weekStart } },
        _count: { id: true },
      }),
      prisma.foodDiaryEntry.groupBy({
        by: ["userId"],
        where: { userId: { in: patientIds }, entryDate: { gte: sevenDaysAgoEntry } },
        _count: { id: true },
      }),
      prisma.checkInResponse.findMany({
        where: {
          userId: { in: patientIds },
          updatedAt: { gte: sevenDaysAgo },
        },
        include: {
          template: { select: { id: true, steps: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.checkInDispatchSchedule.findMany({
        where: {
          status: { in: ["pending", "sent"] },
          scheduledAt: { gte: sevenDaysAgo },
        },
        select: { userIds: true, status: true, scheduledAt: true },
      }),
      prisma.user.findMany({
        where: { role: "NUTRICIONISTA" },
        select: { id: true },
      }),
    ]);

    const foodWeekMap = new Map(foodWeek.map((r) => [r.userId, r._count.id]));
    const food7dMap = new Map(food7d.map((r) => [r.userId, r._count.id]));

    const questionnaireMap = new Map<"none" | "partial" | "complete", never>();
    const patientQuestionnaire = new Map<string, "none" | "partial" | "complete">();
    for (const response of responses) {
      if (patientQuestionnaire.has(response.userId)) continue;
      patientQuestionnaire.set(
        response.userId,
        questionnaireFillLevel(response.answers, response.template?.steps),
      );
    }

    const scheduledPatientIds = new Set<string>();
    for (const schedule of schedules) {
      const ids = Array.isArray(schedule.userIds) ? schedule.userIds : [];
      if (!ids.length) {
        for (const id of patientIds) scheduledPatientIds.add(id);
        continue;
      }
      for (const id of ids) {
        if (typeof id === "string") scheduledPatientIds.add(id);
      }
    }

    const nutriId = nutriUsers[0]?.id || null;
    const lastChatReplyDays = new Map<string, number>();

    async function applyBellaFallback() {
      const bellaReplies = await prisma.bellaMessage.findMany({
        where: {
          userId: { in: patientIds },
          role: "user",
          createdAt: { gte: sevenDaysAgo },
        },
        select: { userId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
      for (const msg of bellaReplies) {
        if (lastChatReplyDays.has(msg.userId)) continue;
        const days = Math.max(
          0,
          Math.floor((now.getTime() - msg.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
        );
        lastChatReplyDays.set(msg.userId, days);
      }
    }

    if (nutriId) {
      const jidToPatient = new Map<string, string>();
      for (const patient of patients) {
        for (const jid of phoneToJidCandidates(patient.phone)) {
          jidToPatient.set(jid, patient.id);
        }
      }

      const jids = [...jidToPatient.keys()];
      if (jids.length) {
        const inbound = await prisma.whatsappMessage.findMany({
          where: {
            userId: nutriId,
            fromMe: false,
            chatJid: { in: jids },
            messageTimestamp: { gte: BigInt(Math.floor(sevenDaysAgo.getTime() / 1000)) },
          },
          select: { chatJid: true, messageTimestamp: true },
          orderBy: { messageTimestamp: "desc" },
        });

        for (const msg of inbound) {
          const patientId = jidToPatient.get(msg.chatJid);
          if (!patientId || lastChatReplyDays.has(patientId)) continue;
          const tsMs = Number(msg.messageTimestamp) * 1000;
          const days = Math.max(0, Math.floor((now.getTime() - tsMs) / (24 * 60 * 60 * 1000)));
          lastChatReplyDays.set(patientId, days);
        }
      }
    }

    await applyBellaFallback();

    const danger: Array<{ id: string; name: string; avatar: string | null; reason: string }> = [];
    const attention: Array<{ id: string; name: string; avatar: string | null; reason: string }> = [];
    const success: Array<{ id: string; name: string; avatar: string | null; reason: string }> = [];

    for (const patient of patients) {
      const foodPostsWeek = foodWeekMap.get(patient.id) || 0;
      const foodPosts7d = food7dMap.get(patient.id) || 0;
      const waterPostsWeek = countWaterPostsInRange(patient.patientGoalsData, weekStartKey, todayKey);
      const waterPosts7d = countWaterPostsInRange(patient.patientGoalsData, sevenDaysAgoKey, todayKey);
      const chatReplyWithinDays = lastChatReplyDays.has(patient.id)
        ? (lastChatReplyDays.get(patient.id) as number)
        : null;
      const hasSchedule = scheduledPatientIds.has(patient.id);
      const questionnaire = patientQuestionnaire.get(patient.id) || "none";

      const metrics = {
        foodPostsWeek,
        foodPosts7d,
        waterPostsWeek,
        waterPosts7d,
        chatReplyWithinDays,
        hasSchedule,
        questionnaire,
      };

      if (isSuccessZone(metrics)) {
        success.push({
          id: patient.id,
          name: patient.name,
          avatar: patient.avatar,
          reason: foodPostsWeek >= 4
            ? "Pelo menos 4 postagens no diário na semana"
            : waterPostsWeek >= 4
              ? "Pelo menos 4 postagens de hidratação na semana"
              : "Chat em até 3 dias + agendamento + questionário completo",
        });
        continue;
      }

      if (isAttentionZone(metrics)) {
        attention.push({
          id: patient.id,
          name: patient.name,
          avatar: patient.avatar,
          reason: foodPosts7d >= 1
            ? "Pelo menos 1 postagem no diário em 7 dias"
            : waterPosts7d >= 1
              ? "Pelo menos 1 postagem de hidratação em 7 dias"
              : "Chat em até 7 dias + agendamento + questionário parcial",
        });
        continue;
      }

      danger.push({
        id: patient.id,
        name: patient.name,
        avatar: patient.avatar,
        reason: "Não se enquadra na zona de sucesso nem na de atenção",
      });
    }

    return {
      weekStart: weekStartKey,
      zones: { danger, attention, success },
      counts: {
        danger: danger.length,
        attention: attention.length,
        success: success.length,
      },
    };
  }
}
