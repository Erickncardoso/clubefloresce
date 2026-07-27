import type { KnowledgeSourceType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { extractPdfBlocks } from "../ai/pdf-block-reader";
import { buildChunksFromText, buildSingleChunk } from "./chunker.service";
import { embeddingService } from "./embedding.service";
import { knowledgeRepository } from "./knowledge.repository";
import { NUTRI_KNOWLEDGE_NOTES } from "./nutri-notes";
import type { ChunkDraft, IndexedChunkInput } from "./types";

function lessonUrl(courseId: string, lessonId: string): string {
  return `/modulos/${lessonId}?course=${courseId}`;
}

function courseUrl(courseId: string): string {
  return `/cursos/${courseId}`;
}

async function indexDrafts(
  sourceType: KnowledgeSourceType,
  sourceId: string,
  drafts: ChunkDraft[],
  userId?: string | null,
): Promise<number> {
  if (!drafts.length) {
    await knowledgeRepository.deleteSourceChunks(sourceType, sourceId, userId);
    return 0;
  }

  if (!embeddingService.isEnabled()) {
    console.warn(`[RAG] OPENAI ausente — pulando indexação ${sourceType}:${sourceId}`);
    return 0;
  }

  const indexed: IndexedChunkInput[] = drafts.map((draft) => ({
    ...draft,
    sourceType,
    sourceId,
    userId: userId ?? null,
  }));

  const embeddings = await embeddingService.embedBatch(indexed.map((item) => `${item.title}\n${item.content}`));
  return knowledgeRepository.upsertChunks(indexed, embeddings);
}

export async function indexLesson(lessonId: string): Promise<number> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) return 0;

  const transcriptionLines = Array.isArray(lesson.transcription)
    ? (lesson.transcription as { text?: string }[])
    : [];
  const transcriptionText = transcriptionLines
    .map((line) => String(line?.text || "").trim())
    .filter(Boolean)
    .join("\n");

  const body = [lesson.content, transcriptionText].filter(Boolean).join("\n\n");
  const drafts = buildChunksFromText(body, {
    title: `${lesson.module.course.title} — ${lesson.title}`,
    url: lessonUrl(lesson.module.courseId, lesson.id),
    metadata: {
      courseId: lesson.module.courseId,
      moduleId: lesson.moduleId,
      lessonId: lesson.id,
    },
  });

  return indexDrafts("lesson", lessonId, drafts);
}

export async function indexCourse(courseId: string): Promise<number> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { modules: { include: { lessons: true }, orderBy: { order: "asc" } } },
  });
  if (!course) return 0;

  const moduleSummaries = course.modules
    .map((module) => {
      const lessonTitles = module.lessons.map((lesson) => lesson.title).join(", ");
      return `Módulo ${module.title}: ${module.description || ""}. Aulas: ${lessonTitles}`;
    })
    .join("\n");

  const text = `${course.title}\n${course.description || ""}\n${moduleSummaries}`;
  const drafts = buildChunksFromText(text, {
    title: course.title,
    url: courseUrl(course.id),
    metadata: { courseId: course.id },
  });

  return indexDrafts("course", courseId, drafts);
}

export async function indexEbook(ebookId: string): Promise<number> {
  const ebook = await prisma.ebook.findUnique({ where: { id: ebookId } });
  if (!ebook) return 0;

  let pdfText = "";
  try {
    const res = await fetch(ebook.fileUrl);
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      const extracted = await extractPdfBlocks(buffer, ebook.title);
      pdfText = extracted.fullText;
    }
  } catch (error) {
    console.warn(`[RAG] Falha ao extrair ebook ${ebookId}:`, (error as Error)?.message || error);
  }

  const text = `${ebook.title}\n${ebook.description}\n${pdfText}`;
  const drafts = buildChunksFromText(text, {
    title: ebook.title,
    url: "/ebooks",
    metadata: { ebookId: ebook.id, fileUrl: ebook.fileUrl },
  });

  return indexDrafts("ebook", ebookId, drafts);
}

export async function indexPost(postId: string): Promise<number> {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return 0;

  const drafts = buildChunksFromText(post.content, {
    title: "Comunidade — post da nutricionista",
    url: "/comunidade",
    metadata: { postId: post.id, imageUrl: post.imageUrl },
  });

  return indexDrafts("post", postId, drafts);
}

export async function indexFoodItem(foodId: string): Promise<number> {
  const food = await prisma.foodItem.findUnique({ where: { id: foodId } });
  if (!food) return 0;

  const text = [
    food.name,
    food.category,
    food.searchText,
    `Fonte: ${food.source}`,
    `Calorias: ${food.caloriesKcal ?? "?"} kcal`,
    `Proteína: ${food.proteinG ?? "?"} g`,
    `Carboidrato: ${food.carbsG ?? "?"} g`,
    `Gordura: ${food.fatG ?? "?"} g`,
    `Fibra: ${food.fiberG ?? "?"} g`,
  ].join("\n");

  const drafts = buildSingleChunk(text, {
    title: `Alimento — ${food.name}`,
    url: "/substituicao",
    metadata: { foodId: food.id, source: food.source },
  });

  return indexDrafts("food", foodId, drafts);
}

export async function indexFoodOverride(overrideId: string): Promise<number> {
  const food = await prisma.foodOverride.findUnique({ where: { id: overrideId } });
  if (!food) return 0;

  const text = [
    food.name,
    food.category,
    food.searchText,
    `Calorias: ${food.caloriesKcal} kcal`,
    `Proteína: ${food.proteinG} g`,
    `Carboidrato: ${food.carbsG} g`,
    `Gordura: ${food.fatG} g`,
  ].join("\n");

  const drafts = buildSingleChunk(text, {
    title: `Alimento — ${food.name}`,
    url: "/substituicao",
    metadata: { foodOverrideId: food.id },
  });

  return indexDrafts("food", `override:${food.id}`, drafts);
}

export async function indexMealPlan(userId: string): Promise<number> {
  const plan = await prisma.patientMealPlan.findUnique({ where: { userId } });
  if (!plan) {
    await knowledgeRepository.deleteSourceChunks("meal_plan", userId, userId);
    return 0;
  }

  const planJson = JSON.stringify(plan.plan, null, 2);
  const text = [
    plan.title || "Plano alimentar",
    plan.patientName ? `Paciente: ${plan.patientName}` : "",
    plan.prescribedAt ? `Prescrito em: ${plan.prescribedAt}` : "",
    planJson,
  ].filter(Boolean).join("\n");

  const drafts = buildChunksFromText(text, {
    title: plan.title || "Plano alimentar prescrito",
    url: "/dieta",
    metadata: { userId, planId: plan.id },
  });

  return indexDrafts("meal_plan", userId, drafts, userId);
}

export async function indexPatientProfile(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      patientProfileData: true,
      patientGoalsData: true,
      onboardingCompletedAt: true,
    },
  });
  if (!user) return 0;

  const text = JSON.stringify({
    name: user.name,
    profile: user.patientProfileData,
    goals: user.patientGoalsData,
    onboardingCompletedAt: user.onboardingCompletedAt,
  }, null, 2);

  const drafts = buildSingleChunk(text, {
    title: `Perfil — ${user.name}`,
    url: "/perfil",
    metadata: { userId },
  });

  return indexDrafts("profile", userId, drafts, userId);
}

export async function indexCheckIns(userId: string): Promise<number> {
  const [weekly, custom] = await Promise.all([
    prisma.weeklyCheckIn.findMany({
      where: { userId },
      orderBy: { weekStart: "desc" },
      take: 12,
    }),
    prisma.checkInResponse.findMany({
      where: { userId },
      include: { template: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const lines: string[] = [];
  for (const item of weekly) {
    lines.push(
      `Check-in semanal ${item.weekStart.toISOString().slice(0, 10)}: humor ${item.mood}, energia ${item.energy}, aderência ${item.adherence ?? "?"}, peso ${item.weightKg ?? "?"} kg. Notas: ${item.notes || "—"}`,
    );
  }
  for (const item of custom) {
    lines.push(
      `Check-in ${item.template?.title || item.templateId} (${item.periodKey}): ${JSON.stringify(item.answers)}`,
    );
  }

  const drafts = buildChunksFromText(lines.join("\n"), {
    title: "Histórico de check-ins",
    url: "/check-in/historico",
    metadata: { userId },
  });

  return indexDrafts("checkin", userId, drafts, userId);
}

export async function indexNutriNotes(): Promise<number> {
  let total = 0;
  for (const note of NUTRI_KNOWLEDGE_NOTES) {
    const drafts = buildSingleChunk(note.content, {
      title: note.title,
      url: "/conteudo",
      metadata: { noteId: note.id },
    });
    total += await indexDrafts("nutri_note", note.id, drafts);
  }
  return total;
}

export async function backfillFoodSources(): Promise<number> {
  let total = 0;
  const foods = await prisma.foodItem.findMany({ select: { id: true } });
  for (const food of foods) {
    total += await indexFoodItem(food.id);
  }
  const overrides = await prisma.foodOverride.findMany({ select: { id: true } });
  for (const item of overrides) {
    total += await indexFoodOverride(item.id);
  }
  return total;
}

export async function backfillGlobalSources(): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};

  const courses = await prisma.course.findMany({ select: { id: true } });
  stats.course = 0;
  for (const course of courses) {
    stats.course += await indexCourse(course.id);
  }

  const lessons = await prisma.lesson.findMany({ select: { id: true } });
  stats.lesson = 0;
  for (const lesson of lessons) {
    stats.lesson += await indexLesson(lesson.id);
  }

  const ebooks = await prisma.ebook.findMany({ select: { id: true } });
  stats.ebook = 0;
  for (const ebook of ebooks) {
    stats.ebook += await indexEbook(ebook.id);
  }

  const posts = await prisma.post.findMany({ select: { id: true } });
  stats.post = 0;
  for (const post of posts) {
    stats.post += await indexPost(post.id);
  }

  const foods = await prisma.foodItem.findMany({ select: { id: true }, take: 5000 });
  stats.food = 0;
  for (const food of foods) {
    stats.food += await indexFoodItem(food.id);
  }

  const overrides = await prisma.foodOverride.findMany({ select: { id: true } });
  for (const item of overrides) {
    stats.food += await indexFoodOverride(item.id);
  }

  stats.nutri_note = await indexNutriNotes();
  return stats;
}

export async function backfillPatientSources(userId: string): Promise<Record<string, number>> {
  return {
    meal_plan: await indexMealPlan(userId),
    profile: await indexPatientProfile(userId),
    checkin: await indexCheckIns(userId),
  };
}
