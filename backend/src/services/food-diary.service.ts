import { randomUUID } from "crypto";
import { BellaRepository } from "../repositories/bella.repository";
import { FoodDiaryRepository } from "../repositories/food-diary.repository";
import { round1, sumItems } from "./bella/meal-item-math";
import { enrichMealItemsWithFoodBank } from "./bella/meal-food-enricher";
import type {
  DailyDiarySummary,
  MealItemDraft,
  MacroTotals,
  MonthDiarySummary,
  NutritionTargets,
} from "../types/food-diary.types";

import { entryDateFromKey, getDateKeyInTimeZone } from "../utils/patient-timezone";
import { normalizeFoodDiaryCommentContent } from "../utils/food-diary-comment";
import { FoodDiarySocialRepository } from "../repositories/food-diary-social.repository";
import { NotificationRepository } from "../repositories/notification.repository";
import { prisma } from "../lib/prisma";
import { isDiarySocialPushEnabled } from "./patient-preferences.service";
import type { PatientProfileData } from "../types/patient-profile.types";

let foodDiaryRepository: FoodDiaryRepository | null = null;
let bellaRepository: BellaRepository | null = null;

function getFoodDiaryRepository(): FoodDiaryRepository {
  if (!foodDiaryRepository) foodDiaryRepository = new FoodDiaryRepository();
  return foodDiaryRepository;
}

function getBellaRepository(): BellaRepository {
  if (!bellaRepository) bellaRepository = new BellaRepository();
  return bellaRepository;
}

const diaryNotificationRepository = new NotificationRepository();

function firstName(name?: string | null): string {
  return String(name || "").trim().split(/\s+/)[0] || "Sua nutricionista";
}

function asProfile(value: unknown): PatientProfileData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as PatientProfileData;
}

async function notifyDiaryOwner(input: {
  ownerId: string;
  actorId: string;
  title: string;
  body: string;
  sourceKey: string;
}) {
  if (!input.ownerId || input.ownerId === input.actorId) return;
  const owner = await prisma.user.findUnique({
    where: { id: input.ownerId },
    select: { patientProfileData: true },
  });
  if (!owner || !isDiarySocialPushEnabled(asProfile(owner.patientProfileData))) return;

  await diaryNotificationRepository.upsertBySourceKey({
    userId: input.ownerId,
    type: "community",
    title: input.title,
    body: input.body,
    actionPath: "/diario",
    sourceKey: input.sourceKey,
  });
}

function subtractMacros(targets: NutritionTargets, consumed: MacroTotals): MacroTotals {
  return {
    caloriesKcal: Math.max(0, Math.round(targets.caloriesKcal - consumed.caloriesKcal)),
    carbsG: round1(Math.max(0, targets.carbsG - consumed.carbsG)),
    proteinG: round1(Math.max(0, targets.proteinG - consumed.proteinG)),
    fatG: round1(Math.max(0, targets.fatG - consumed.fatG)),
  };
}

async function prepareEntryItems(items: MealItemDraft[]) {
  const rawItems = items.map((item) => ({
    id: item.id || randomUUID(),
    name: String(item.name || "").trim(),
    grams: Math.max(1, Math.round(Number(item.grams) || 0)),
    caloriesKcal: Math.max(0, Math.round(Number(item.caloriesKcal) || 0)),
    carbsG: round1(Number(item.carbsG) || 0),
    proteinG: round1(Number(item.proteinG) || 0),
    fatG: round1(Number(item.fatG) || 0),
    foodId: item.foodId ? String(item.foodId) : null,
    source: item.source || (item.foodId ? "food_bank" : "ai"),
    originalName: item.originalName ? String(item.originalName) : null,
  }));

  if (!rawItems.length) throw new Error("Adicione pelo menos um alimento.");
  if (rawItems.some((item) => !item.name)) {
    throw new Error("Preencha o nome de todos os alimentos.");
  }

  const enriched = await enrichMealItemsWithFoodBank(rawItems);
  return { items: enriched, totals: sumItems(enriched) };
}

function parseItems(raw: unknown): MealItemDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const item = row as MealItemDraft;
      return {
        id: String(item.id || ""),
        name: String(item.name || "").trim(),
        grams: Math.max(1, Math.round(Number(item.grams) || 0)),
        caloriesKcal: Math.max(0, Math.round(Number(item.caloriesKcal) || 0)),
        carbsG: round1(Number(item.carbsG) || 0),
        proteinG: round1(Number(item.proteinG) || 0),
        fatG: round1(Number(item.fatG) || 0),
        foodId: item.foodId ? String(item.foodId) : null,
        source: item.source || (item.foodId ? "food_bank" : "ai"),
        originalName: item.originalName ? String(item.originalName) : null,
      };
    })
    .filter((item) => item.name);
}

export function buildDiaryAssistantReply(
  mealLabel: string,
  _items: MealItemDraft[],
  mealTotals: MacroTotals,
  dailySummary: DailyDiarySummary,
): string {
  return (
    `Registrei seu **${mealLabel}** no diário alimentar.\n\n` +
    `## Total desta refeição\n` +
    `- Calorias: ${mealTotals.caloriesKcal} kcal\n` +
    `- Carboidratos: ${mealTotals.carbsG} g\n` +
    `- Proteínas: ${mealTotals.proteinG} g\n` +
    `- Gorduras: ${mealTotals.fatG} g\n\n` +
    `## Seu dia até agora\n` +
    `- Consumido: ${dailySummary.consumed.caloriesKcal} / ${dailySummary.targets.caloriesKcal} kcal\n` +
    `- Proteínas: ${dailySummary.consumed.proteinG} / ${dailySummary.targets.proteinG} g\n` +
    `- Carboidratos: ${dailySummary.consumed.carbsG} / ${dailySummary.targets.carbsG} g\n` +
    `- Gorduras: ${dailySummary.consumed.fatG} / ${dailySummary.targets.fatG} g\n\n` +
    `## O que falta\n` +
    `- Calorias: ${dailySummary.remaining.caloriesKcal} kcal\n` +
    `- Proteínas: ${dailySummary.remaining.proteinG} g\n` +
    `- Carboidratos: ${dailySummary.remaining.carbsG} g\n` +
    `- Gorduras: ${dailySummary.remaining.fatG} g`
  );
}

export class FoodDiaryService {
  async getDailySummary(userId: string, dateKey?: string): Promise<DailyDiarySummary> {
    const key = dateKey || getDateKeyInTimeZone("UTC");
    const entryDate = entryDateFromKey(key);
    const repo = getFoodDiaryRepository();
    const targetsRow = await repo.getOrCreateTargets(userId);
    const entries = await repo.findEntriesByDate(userId, entryDate);

    const targets: NutritionTargets = {
      caloriesKcal: targetsRow.caloriesKcal,
      carbsG: targetsRow.carbsG,
      proteinG: targetsRow.proteinG,
      fatG: targetsRow.fatG,
    };

    const consumed = entries.reduce(
      (acc, entry) => ({
        caloriesKcal: acc.caloriesKcal + entry.caloriesKcal,
        carbsG: round1(acc.carbsG + entry.carbsG),
        proteinG: round1(acc.proteinG + entry.proteinG),
        fatG: round1(acc.fatG + entry.fatG),
      }),
      { caloriesKcal: 0, carbsG: 0, proteinG: 0, fatG: 0 },
    );

    return {
      date: key,
      targets,
      consumed,
      remaining: subtractMacros(targets, consumed),
      entries: entries.map((entry) => ({
        id: entry.id,
        mealType: entry.mealType,
        mealLabel: entry.mealLabel,
        imageUrl: entry.imageUrl,
        caloriesKcal: entry.caloriesKcal,
        carbsG: entry.carbsG,
        proteinG: entry.proteinG,
        fatG: entry.fatG,
        items: parseItems(entry.items),
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }

  async getMonthSummary(userId: string, year: number, month: number): Promise<MonthDiarySummary> {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error("Ano inválido.");
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error("Mês inválido.");
    }

    const repo = getFoodDiaryRepository();
    const targetsRow = await repo.getOrCreateTargets(userId);
    const targets: NutritionTargets = {
      caloriesKcal: targetsRow.caloriesKcal,
      carbsG: targetsRow.carbsG,
      proteinG: targetsRow.proteinG,
      fatG: targetsRow.fatG,
    };

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));
    const entries = await repo.findEntriesInRange(userId, startDate, endDate);

    const byDate = new Map<string, MacroTotals & { entryCount: number }>();
    for (const entry of entries) {
      const key = entry.entryDate.toISOString().slice(0, 10);
      const current = byDate.get(key) || {
        caloriesKcal: 0,
        carbsG: 0,
        proteinG: 0,
        fatG: 0,
        entryCount: 0,
      };
      byDate.set(key, {
        caloriesKcal: current.caloriesKcal + entry.caloriesKcal,
        carbsG: round1(current.carbsG + entry.carbsG),
        proteinG: round1(current.proteinG + entry.proteinG),
        fatG: round1(current.fatG + entry.fatG),
        entryCount: current.entryCount + 1,
      });
    }

    const daysInMonth = endDate.getUTCDate();
    const days = [];
    let totals: MacroTotals = { caloriesKcal: 0, carbsG: 0, proteinG: 0, fatG: 0 };
    let daysWithEntries = 0;

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const row = byDate.get(dateKey);
      const consumed: MacroTotals = row
        ? {
            caloriesKcal: Math.round(row.caloriesKcal),
            carbsG: row.carbsG,
            proteinG: row.proteinG,
            fatG: row.fatG,
          }
        : { caloriesKcal: 0, carbsG: 0, proteinG: 0, fatG: 0 };

      if (row?.entryCount) {
        daysWithEntries += 1;
        totals = {
          caloriesKcal: totals.caloriesKcal + consumed.caloriesKcal,
          carbsG: round1(totals.carbsG + consumed.carbsG),
          proteinG: round1(totals.proteinG + consumed.proteinG),
          fatG: round1(totals.fatG + consumed.fatG),
        };
      }

      days.push({
        date: dateKey,
        consumed,
        entryCount: row?.entryCount || 0,
      });
    }

    return {
      year,
      month,
      targets,
      days,
      totals,
      daysWithEntries,
    };
  }

  async confirmEntry(
    userId: string,
    payload: {
      items: MealItemDraft[];
      mealType: string;
      mealLabel?: string;
      imageUrl?: string;
      topic?: string;
      userMessageId?: string;
    },
    dateKey?: string,
  ) {
    const { items, totals } = await prepareEntryItems(payload.items);
    const key = dateKey || getDateKeyInTimeZone("UTC");
    const entryDate = entryDateFromKey(key);
    const mealLabel = payload.mealLabel?.trim() || "Refeição";

    const entry = await getFoodDiaryRepository().createEntry({
      userId,
      entryDate,
      mealType: payload.mealType || "other",
      mealLabel,
      imageUrl: payload.imageUrl,
      items,
      ...totals,
    });

    const dailySummary = await this.getDailySummary(userId, key);
    const reply = buildDiaryAssistantReply(mealLabel, items, totals, dailySummary);

    const assistantMsg = await getBellaRepository().create(userId, "assistant", reply, {
      topic: payload.topic || "meal",
      metadata: {
        topic: "meal",
        taskType: "meal_diary",
        foodDiaryEntryId: entry.id,
        mealTotals: totals,
      },
    });

    return {
      entry,
      dailySummary,
      message: assistantMsg,
    };
  }

  async updateEntry(
    userId: string,
    entryId: string,
    payload: {
      items: MealItemDraft[];
      mealType?: string;
      mealLabel?: string;
      imageUrl?: string;
    },
  ) {
    const repo = getFoodDiaryRepository();
    const existing = await repo.findEntryByIdForUser(userId, entryId);
    if (!existing) throw new Error("Refeição não encontrada.");

    const { items, totals } = await prepareEntryItems(payload.items);
    const mealLabel = payload.mealLabel?.trim() || existing.mealLabel || "Refeição";

    const entry = await repo.updateEntry(entryId, {
      mealType: payload.mealType || existing.mealType,
      mealLabel,
      imageUrl: payload.imageUrl !== undefined ? payload.imageUrl : existing.imageUrl || undefined,
      items,
      ...totals,
    });

    const key = existing.entryDate.toISOString().slice(0, 10);
    const dailySummary = await this.getDailySummary(userId, key);

    return { entry, dailySummary };
  }

  async deleteEntry(userId: string, entryId: string) {
    const repo = getFoodDiaryRepository();
    const existing = await repo.findEntryByIdForUser(userId, entryId);
    if (!existing) throw new Error("Refeição não encontrada.");

    await repo.deleteEntry(entryId);

    const key = existing.entryDate.toISOString().slice(0, 10);
    const dailySummary = await this.getDailySummary(userId, key);

    return { dailySummary };
  }

  async syncPlanCheckEntry(
    userId: string,
    payload: {
      mealType: string;
      mealLabel?: string;
      items: MealItemDraft[];
    },
    dateKey?: string,
  ) {
    const key = dateKey || getDateKeyInTimeZone("UTC");
    const entryDate = entryDateFromKey(key);
    const repo = getFoodDiaryRepository();
    const mealType = String(payload.mealType || "").trim() || "other";
    const mealLabel = payload.mealLabel?.trim() || "Plano alimentar";
    const existing = await repo.findPlanCheckEntry(userId, entryDate, mealType);

    const rawItems = (payload.items || []).map((item) => ({
      ...item,
      source: "meal_plan" as const,
    }));

    if (!rawItems.length) {
      if (existing) await repo.deleteEntry(existing.id);
      await repo.deleteExtraPlanCheckEntries(userId, entryDate, mealType);
      const dailySummary = await this.getDailySummary(userId, key);
      return { entry: null, dailySummary };
    }

    const { items, totals } = await prepareEntryItems(rawItems);

    if (existing) {
      await repo.deleteExtraPlanCheckEntries(userId, entryDate, mealType, existing.id);
      const entry = await repo.updateEntry(existing.id, {
        mealType,
        mealLabel,
        imageUrl: undefined,
        items,
        ...totals,
      });
      const dailySummary = await this.getDailySummary(userId, key);
      return { entry, dailySummary };
    }

    await repo.deleteExtraPlanCheckEntries(userId, entryDate, mealType);

    const entry = await repo.createEntry({
      userId,
      entryDate,
      mealType,
      mealLabel,
      items,
      ...totals,
    });
    const dailySummary = await this.getDailySummary(userId, key);
    return { entry, dailySummary };
  }

  private async buildPhotoFeed(opts: {
    viewerId: string;
    limit?: number;
    skip?: number;
    userId?: string;
    includePatient?: boolean;
  }) {
    const take = Math.min(40, Math.max(1, Number(opts.limit) || 18));
    const offset = Math.max(0, Number(opts.skip) || 0);
    const rows = await getFoodDiaryRepository().findRecentForNutri(take + 1, {
      withImageOnly: true,
      skip: offset,
      userId: opts.userId,
    });
    const hasMore = rows.length > take;
    const entries = hasMore ? rows.slice(0, take) : rows;
    const social = new FoodDiarySocialRepository();
    const ids = entries.map((e) => e.id);
    const { likeCounts, commentCounts, likedIds, previews } = await social.countsForEntries(
      ids,
      opts.viewerId,
    );

    return {
      entries: entries.map((entry) => {
        const likesCount = likeCounts.get(entry.id) || 0;
        return {
          id: entry.id,
          entryDate: entry.entryDate,
          mealType: entry.mealType,
          mealLabel: entry.mealLabel,
          imageUrl: entry.imageUrl,
          caloriesKcal: entry.caloriesKcal,
          proteinG: entry.proteinG,
          carbsG: entry.carbsG,
          fatG: entry.fatG,
          createdAt: entry.createdAt,
          ...(opts.includePatient ? { patient: entry.user } : {}),
          likesCount,
          likedByMe: likedIds.has(entry.id),
          likedByNutri: likesCount > 0,
          commentsCount: commentCounts.get(entry.id) || 0,
          commentsPreview: (previews.get(entry.id) || []).map((c) => ({
            id: c.id,
            content: c.content,
            createdAt: c.createdAt,
            author: c.author,
          })),
        };
      }),
      hasMore,
      nextSkip: hasMore ? offset + take : null,
    };
  }

  async getAdminFeed(limit = 18, viewerId: string, skip = 0) {
    return this.buildPhotoFeed({
      viewerId,
      limit,
      skip,
      includePatient: true,
    });
  }

  async getPatientFeed(userId: string, limit = 18, skip = 0) {
    return this.buildPhotoFeed({
      viewerId: userId,
      limit,
      skip,
      userId,
    });
  }

  async toggleEntryLike(entryId: string, userId: string) {
    const social = new FoodDiarySocialRepository();
    const entry = await social.assertEntryWithImage(entryId);
    if (!entry) throw new Error("Entrada não encontrada.");
    const existing = await social.findLike(entryId, userId);
    if (existing) await social.deleteLike(entryId, userId);
    else {
      await social.createLike(entryId, userId);
      const actor = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      const meal = entry.mealLabel?.trim() || "prato";
      await notifyDiaryOwner({
        ownerId: entry.userId,
        actorId: userId,
        title: "Diário",
        body: `${firstName(actor?.name)} curtiu seu ${meal}.`,
        sourceKey: `diary-like:${entryId}:${userId}`,
      });
    }
    const likesCount = await social.countLikes(entryId);
    return { likedByMe: !existing, likesCount };
  }

  async listEntryComments(entryId: string, ownerId?: string) {
    const social = new FoodDiarySocialRepository();
    const entry = await social.assertEntryWithImage(entryId, ownerId);
    if (!entry) throw new Error("Entrada não encontrada.");
    return social.listComments(entryId);
  }

  async getEntrySocial(entryId: string, ownerId: string) {
    const social = new FoodDiarySocialRepository();
    const entry = await social.assertEntryWithImage(entryId, ownerId);
    if (!entry) throw new Error("Entrada não encontrada.");
    const [likes, comments] = await Promise.all([
      social.listLikes(entryId),
      social.listComments(entryId),
    ]);
    return {
      likes: likes.map((like) => ({
        id: like.user.id,
        name: like.user.name,
        avatar: like.user.avatar,
        role: like.user.role,
      })),
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        author: c.author,
      })),
    };
  }

  async addEntryComment(entryId: string, authorId: string, rawContent: unknown, ownerId?: string) {
    const content = normalizeFoodDiaryCommentContent(rawContent);
    const social = new FoodDiarySocialRepository();
    const entry = await social.assertEntryWithImage(entryId, ownerId);
    if (!entry) throw new Error("Entrada não encontrada.");
    const comment = await social.createComment(entryId, authorId, content);
    await notifyDiaryOwner({
      ownerId: entry.userId,
      actorId: authorId,
      title: "Diário",
      body: `${firstName(comment.author?.name)} comentou no seu ${entry.mealLabel?.trim() || "prato"}.`,
      sourceKey: `diary-comment:${comment.id}`,
    });
    return comment;
  }

  async updateEntryComment(commentId: string, authorId: string, rawContent: unknown) {
    const content = normalizeFoodDiaryCommentContent(rawContent);
    const social = new FoodDiarySocialRepository();
    const comment = await social.findCommentById(commentId);
    if (!comment) throw new Error("Comentário não encontrado.");
    if (comment.authorId !== authorId) {
      throw new Error("Você só pode editar o seu próprio comentário.");
    }
    return social.updateComment(commentId, content);
  }

  async deleteEntryComment(commentId: string, authorId: string) {
    const social = new FoodDiarySocialRepository();
    const comment = await social.findCommentById(commentId);
    if (!comment) throw new Error("Comentário não encontrado.");
    if (comment.authorId !== authorId) {
      throw new Error("Você só pode apagar o seu próprio comentário.");
    }
    await social.deleteComment(commentId);
    return { ok: true, entryId: comment.entryId };
  }

  async getAdminConsumptionToday(dateKey?: string) {
    const key = dateKey || getDateKeyInTimeZone("America/Sao_Paulo");
    const entryDate = entryDateFromKey(key);
    const rows = await getFoodDiaryRepository().findTodayConsumptionSummary(entryDate);

    const byPatient = new Map<
      string,
      {
        patient: { id: string; name: string; avatar: string | null };
        meals: number;
        caloriesKcal: number;
        proteinG: number;
        carbsG: number;
        fatG: number;
      }
    >();

    for (const row of rows) {
      const current = byPatient.get(row.userId) || {
        patient: {
          id: row.user.id,
          name: row.user.name,
          avatar: row.user.avatar,
        },
        meals: 0,
        caloriesKcal: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
      };
      current.meals += 1;
      current.caloriesKcal += row.caloriesKcal;
      current.proteinG += row.proteinG;
      current.carbsG += row.carbsG;
      current.fatG += row.fatG;
      byPatient.set(row.userId, current);
    }

    const patients = Array.from(byPatient.values())
      .map((item) => ({
        ...item,
        caloriesKcal: Math.round(item.caloriesKcal),
        proteinG: Math.round(item.proteinG * 10) / 10,
        carbsG: Math.round(item.carbsG * 10) / 10,
        fatG: Math.round(item.fatG * 10) / 10,
      }))
      .sort((a, b) => b.caloriesKcal - a.caloriesKcal);

    const totals = patients.reduce(
      (acc, item) => ({
        patients: acc.patients + 1,
        meals: acc.meals + item.meals,
        caloriesKcal: acc.caloriesKcal + item.caloriesKcal,
        proteinG: Math.round((acc.proteinG + item.proteinG) * 10) / 10,
        carbsG: Math.round((acc.carbsG + item.carbsG) * 10) / 10,
        fatG: Math.round((acc.fatG + item.fatG) * 10) / 10,
      }),
      { patients: 0, meals: 0, caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );

    return { date: key, totals, patients: patients.slice(0, 8) };
  }
}
